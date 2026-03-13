"""
api/routers/transcribe.py — Upload de Áudio, Transcrição Multi-Modelo e Parsing (Fase B Estendida)

Gerencia requisições de áudio. Decifra a API key do usuário vinda do Supabase via JWT.
Expõe endpoints assíncronos que executam a transcrição em background (via Whisper, Gemini 2.5 ou Local Pyannote) e devolvem os steps para o frontend.
"""

from fastapi import APIRouter, File, UploadFile, Form, Depends, HTTPException, Header, BackgroundTasks
import os
import tempfile
import uuid
from typing import Optional, Dict
from pathlib import Path

from cryptography.fernet import Fernet
from supabase import create_client, Client
from utils.encryption import decrypt_api_key

from openai import OpenAI
from google import genai

from pipeline.e1_parser import get_parser

router = APIRouter()

# ─── IN-MEMORY JOB STORE (Para o MVP, ao invés de Redis) ───
JOBS_DB: Dict[str, dict] = {}

def get_job_state(job_id: str) -> dict:
    if job_id not in JOBS_DB:
        JOBS_DB[job_id] = {
            "status": "pending",
            "logs": [],
            "parsed_data": None,
            "error": None
        }
    return JOBS_DB[job_id]

def update_job_log(job_id: str, message: str, done: bool = False):
    """Auxiliar para injetar logs para o SSE/Polling ler no frontend"""
    print(f"[JOB {job_id}] {message}")
    JOBS_DB[job_id]["logs"].append({"message": message, "done": done})

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

def get_supabase() -> Client:
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise HTTPException(status_code=500, detail="Missing SUPABASE configuration on server.")
    return create_client(SUPABASE_URL, SUPABASE_KEY)

async def get_user_from_token(authorization: Optional[str] = Header(None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid token")
    token = authorization.split(" ")[1]
    supabase = get_supabase()
    
    try:
        res = supabase.auth.get_user(token)
    except Exception as e:
        raise HTTPException(status_code=401, detail="Token expirado ou inválido. Atualize a página.")
        
    if res.user is None:
        raise HTTPException(status_code=401, detail="Invalid token session")
    return {"user_id": res.user.id, "token": token}

def load_keys_from_supabase(user_id: str, token: str, supabase: Client) -> dict:
    """Busca chaves encriptadas do usuário e retorna dicionário descriptografado."""
    # Seta o JWT para passar pelo RLS policies da tabela user_api_keys
    supabase.auth.set_session(token, "")
    resp = supabase.table("user_api_keys").select("provider, encrypted_key").eq("user_id", user_id).execute()
    data = resp.data
    
    if not data:
        raise HTTPException(status_code=400, detail="Nenhuma chave configurada para este usuário. Adicione-as em Configurações.")

    keys = {}
    for row in data:
        provider = row.get("provider")
        enc_key = row.get("encrypted_key")
        if not enc_key: continue
        
        plain = decrypt_api_key(enc_key)
        if provider == "openai":
            keys["OPENAI_API_KEY"] = plain
        elif provider == "google":
            keys["GOOGLE_API_KEY"] = plain
        elif provider == "hf":
            keys["HF_API_KEY"] = plain
        
    return keys

# ─── Tarefa em Background ───

def process_audio_job(job_id: str, 
                      file_path: str, 
                      user_id: str, 
                      token: str,
                      model_flag: str, 
                      metadata: dict):
    """
    Executa toda a via crucis de transcrição dependendo do motor selecionado, 
    alimentando a JOBS_DB a cada passo. O parser E1 consolida tudo no final.
    """
    state = get_job_state(job_id)
    state["status"] = "processing"
    
    try:
        supabase = get_supabase()
        
        update_job_log(job_id, "Iniciando processo de descriptografia de chaves no cofre...", done=False)
        keys = load_keys_from_supabase(user_id, token, supabase)
        update_job_log(job_id, "Chaves obtidas com sucesso.", done=True)
        
        # ─── BUCKET & STORAGE (Upload do Áudio Real) ───
        bucket_name = "audios"
        file_size = os.path.getsize(file_path)
        
        # O nome do arquivo real. Pra garantir singularidade no bucket usando o UUID job_id
        file_ext = os.path.splitext(file_path)[1]
        storage_path = f"{user_id}/{job_id}{file_ext}"
        
        try:
            # 1. Verifica os buckets existentes
            bucket_list = supabase.storage.list_buckets()
            if not any(b.name == bucket_name for b in bucket_list):
                try:
                    supabase.storage.create_bucket(bucket_name, {"public": False})
                    update_job_log(job_id, f"Oba! Bucket '{bucket_name}' criado no Supabase com sucesso.", done=True)
                except Exception as ex_creation:
                    # Em caso das policies da conta proibirem criar via API
                    update_job_log(job_id, "Bucket inexistente e/ou criação bloqueada pelas suas policies. Vou ignorar erros...", done=True)

            # 2. Upload Arquivo
            update_job_log(job_id, "Iniciando upload do MP3/WAV pro Supabase Storage...", done=False)
            with open(file_path, "rb") as f:
                supabase.storage.from_(bucket_name).upload(path=storage_path, file=f, file_options={"content-type": "audio/mpeg"})
            update_job_log(job_id, "Upload do áudio com sucesso.", done=True)
            
        except Exception as strg_e:
            update_job_log(job_id, f"Aviso Storage: Usando path local de fallback. MSG: {strg_e}", done=True)
            storage_path = f"tmp_upload/{os.path.basename(file_path)}"

        # ─── PREPARAÇÃO DO BANCO (Tabela audio_files) ───
        audio_insert_response = supabase.table("audio_files").insert({
            "user_id": user_id,
            "filename": os.path.basename(file_path),
            "storage_path": storage_path,
            "store_name": metadata.get("store"),
            "vendor_name": metadata.get("vendor"),
            "visit_date": metadata.get("date") if metadata.get("date") else None,
            "file_size_bytes": file_size
        }).execute()
        
        if not audio_insert_response.data:
            raise Exception("Falha ao registrar o arquivo na tabela audio_files")
        
        audio_file_id = audio_insert_response.data[0]["id"]
        update_job_log(job_id, "Registro do áudio (Foreign Key) criado no banco de dados.", done=True)

        raw_text = ""
        
        # ─── WHISPER API (OpenAI) ───
        if model_flag == "whisper":
            api_key = keys.get("OPENAI_API_KEY")
            if not api_key:
                raise ValueError("Chave OpenAI ausente. Atualize em Configurações.")
            update_job_log(job_id, f"Invocando Whisper API remoto (OpenAI)... O arquivo tem {file_size / (1024*1024):.1f} MB.", done=False)
            client = OpenAI(api_key=keys.get("OPENAI_API_KEY"))
            with open(file_path, "rb") as audio_file_obj:
                transcript = client.audio.transcriptions.create(
                    model="whisper-1",
                    file=audio_file_obj,
                    language="pt"
                )
            raw_text = transcript.text
            update_job_log(job_id, "Transcrição via OpenAI Whisper completa.", done=True)

        # ─── GEMINI 2.5 (Google) ───
        elif model_flag == "gemini":
            api_key = keys.get("GOOGLE_API_KEY")
            if not api_key:
                raise ValueError("Chave Google/Gemini ausente. Atualize em Configurações.")
            
            update_job_log(job_id, "Invocando Google Gemini 2.5 para transcrição de áudio...", done=False)
            
            client = genai.Client(api_key=api_key)
            import google.genai.types as types
            
            update_job_log(job_id, "Lendo áudio do disco para envio expresso em memória (Bypass File API)...", done=False)
            with open(file_path, "rb") as f:
                audio_bytes = f.read()
            
            update_job_log(job_id, "Áudio injetado. Solicitando extração do diálogo via Prompt Direto...", done=False)
            prompt = "Transcreva a conversa detalhada contida neste áudio, palavra por palavra, sem fazer resumos. Identifique e separe cada fala com as etiquetas 'Vendedor:' e 'Cliente:'. O Vendedor é o funcionário da loja, que apresenta soluções, oferece produtos ou lidera o atendimento. O Cliente é a pessoa que visita a loja buscando informações ou produtos. Preste muita atenção no contexto (quem atende vs quem é atendido) para NÃO inverter os papéis em momento algum."
            
            response = client.models.generate_content(
                model='gemini-2.5-pro',
                contents=[
                    types.Part.from_bytes(
                        data=audio_bytes,
                        mime_type='audio/mpeg'
                    ),
                    prompt
                ]
            )
            raw_text = response.text
            update_job_log(job_id, "Transcrição via Gemini 2.5 completa.", done=True)

        # ─── O WHISPER LOCAL (Pyannote Diarization) ───
        elif model_flag == "local":
            raise ValueError("O Motor Local (Pyannote/Whisper) está desativado (Status: Em Aberto) devido ao peso do hardware. Utilize 'Whisper API' ou 'Gemini API'.")

        else:
            raise ValueError("Motor de transcrição inválido.")

        # ─── PARSING E1 ───
        update_job_log(job_id, "Ativando Parser NLP (Regex + SpaCy + Heurística)...", done=False)
        parser = get_parser()
        parsed_transcription = parser.parse(raw_text)
        
        # O Pydantic Object -> Dict
        parsed_dict = parsed_transcription.model_dump()
        
        # ─── REGISTRO NO BANCO (Tabela transcriptions) ───
        word_count = len(raw_text.split()) if raw_text else 0
        supabase.table("transcriptions").insert({
            "audio_file_id": audio_file_id,
            "user_id": user_id,
            "text": raw_text,
            "model": model_flag,
            "language": "pt",
            "word_count": word_count,
            "parsed_data": parsed_dict
        }).execute()
        update_job_log(job_id, "Transcrição salva permanentemente no banco de dados Supabase.", done=True)
        
        update_job_log(job_id, f"Parser concluído! Turnos detectados: {parsed_transcription.total_turns} | Confiança: {parsed_transcription.confidence_score:.2f}", done=True)
        
        state["parsed_data"] = parsed_dict
        state["audio_file_id"] = audio_file_id
        state["status"] = "completed"
        
    except Exception as e:
        update_job_log(job_id, f"Erro Fatal na Pipeline: {str(e)}", done=False)
        state["error"] = str(e)
        state["status"] = "failed"
    finally:
        # Cleanup
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
        except:
            pass


# ─── Endpoints Http ───

@router.post("/api/transcribe/async")
async def start_transcription_job(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    store_name: Optional[str] = Form(""),
    vendor_name: Optional[str] = Form(""),
    visit_date: Optional[str] = Form(""),
    transcription_model: Optional[str] = Form("whisper"),
    user_info: dict = Depends(get_user_from_token)
):
    """
    Recebe o arquivo e cria um job que será executado off-band (background).
    Retorna imediatamente o `job_id` para Tracking PBE (Polling Based Events).
    """
    if file.size and file.size > 25 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Audio file too large (> 25MB)")
    if transcription_model not in ["whisper", "gemini", "local"]:
         raise HTTPException(status_code=400, detail="Modelo inválido.")

    job_id = str(uuid.uuid4())
    get_job_state(job_id) # init dictionary
    
    # Save the file to disk since background python process needs a native file
    ext = Path(file.filename).suffix
    temp_fd, temp_path = tempfile.mkstemp(suffix=ext or ".mp3")
    with os.fdopen(temp_fd, "wb") as f_out:
        content = await file.read()
        f_out.write(content)

    meta = {
        "store": store_name,
        "vendor": vendor_name,
        "date": visit_date
    }
    
    background_tasks.add_task(
        process_audio_job, 
        job_id=job_id, 
        file_path=temp_path, 
        user_id=user_info["user_id"], 
        token=user_info["token"],
        model_flag=transcription_model, 
        metadata=meta
    )

    return {"job_id": job_id, "message": "Job successfully queued.", "status": "pending"}


@router.get("/api/transcribe/status/{job_id}")
async def get_transcription_status(
    job_id: str,
    user_info: dict = Depends(get_user_from_token)
):
    """
    Endpoint consumido em loop pelo cliente JS. Retorna o estado atual, os logs gráficos
    e o payload do parser caso concluído.
    """
    if job_id not in JOBS_DB:
        raise HTTPException(status_code=404, detail="Job ID not found.")
    
    return JOBS_DB[job_id]
