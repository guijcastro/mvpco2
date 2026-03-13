import os
import json
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, Header, BackgroundTasks
from pydantic import BaseModel
import spacy

# Reproveitando dependencias seguras de Supabase e chaves
from routers.transcribe import get_user_from_token, load_keys_from_supabase, get_supabase
from schemas.turns import ConversationTurn
from pipeline import e2_extractor, e3_agents, e5_persist

router = APIRouter(prefix="/api/analysis", tags=["analysis"])

try:
    # Carrega spaCy usando o modelo lg baixado
    nlp = spacy.load("pt_core_news_lg")
except Exception as e:
    print("spaCy model pt_core_news_lg not found, loading blank pt")
    nlp = spacy.blank("pt")

def _load_json(filename: str):
    path = Path(f"api/config/{filename}")
    if path.exists():
        with open(path, "r", encoding="utf-8") as f: return json.load(f)
    return []

# Carrega ontologias UMA vez no boot da rota
ONTOLOGY = {
    "products": _load_json("product_catalog.json"),
    "competitors": _load_json("competitors.json"),
    "checklist": _load_json("checklist_zeiss_v6.json"),
    "objections": _load_json("objection_taxonomy.json"),
}

from supabase import create_client
async def _run_analysis_pipeline(audio_file_id: str, user_id: str, token: str, keys: dict):
    supabase = create_client(os.environ.get("SUPABASE_URL"), os.environ.get("SUPABASE_SERVICE_ROLE_KEY", os.environ.get("SUPABASE_KEY")))
    
    try:
        # Fallback para token JWT caso a SUPABASE_SERVICE_ROLE_KEY não esteja configurada no .env
        if not os.environ.get("SUPABASE_SERVICE_ROLE_KEY"):
            supabase.auth.set_session(token, "")
            
        # 1. Recuperar transição parsada (E1 output) do Supabase
        # Bypass RLS via service_role key ou JWT Token para processos background
        logger_db = supabase.table("transcriptions").select("parsed_data").eq("audio_file_id", audio_file_id).execute()
        
        if not logger_db.data or not logger_db.data[0].get("parsed_data"):
             print(f"[{audio_file_id}] Aborting E2: parsed_data not found in transcriptions")
             return
             
        parsed_data = logger_db.data[0]["parsed_data"]
        # Reconstrói os Pydantic ConversationTurns
        turns = [ConversationTurn(**t) for t in parsed_data["turns"]]

        # 2. Executar E2 (Determinístico)
        e2_output = e2_extractor.extract_signals(turns, nlp, ONTOLOGY)
        
        # 3. Executar E3 (Rede de Agentes Assincronos LLM)
        e3_output = await e3_agents.run_agents(e2_output, turns, ONTOLOGY, keys)
        
        # 4. Acionar E5 (Persistência Automática em 6 tabelas)
        e5_persist.persist_to_supabase(supabase, audio_file_id, user_id, turns, e2_output, e3_output)
        
        print(f"[{audio_file_id}] Pipeline Analysis (E2-E5) Concluído brilhantemente.")

    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"[{audio_file_id}] Pipeline Analysis falhou: {str(e)}")

@router.post("/{audio_file_id}")
async def trigger_full_analysis(
    audio_file_id: str, 
    background_tasks: BackgroundTasks, 
    user_info: dict = Depends(get_user_from_token)
):
    """
    Inicia as Fases 2 (E2 até E5) para um áudio previamente transcrito.
    """
    token = user_info["token"]
    user_id = user_info["user_id"]
    
    # Valida o token e carrega chaves criptografadas via RLS
    keys = dict(load_keys_from_supabase(user_id, token, get_supabase()))
    
    # Injete explicitamente no ambiente para que E4 consiga acessar via os SDKs (bypassing the global param issues for now).
    if keys.get("GOOGLE_API_KEY"):
        os.environ["GEMINI_API_KEY"] = keys.get("GOOGLE_API_KEY")
    if keys.get("OPENAI_API_KEY"):
        os.environ["OPENAI_API_KEY"] = keys.get("OPENAI_API_KEY")

    # Inicia pipeline pesado em background async, transportando keys
    background_tasks.add_task(_run_analysis_pipeline, audio_file_id, user_id=user_id, token=token, keys=keys)
    
    return {"status": "processing", "message": "Pipeline de análise Fase 2 instanciada.", "audio_file_id": audio_file_id}
