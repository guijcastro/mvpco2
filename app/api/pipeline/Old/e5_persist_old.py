import logging

logger = logging.getLogger(__name__)

def persist_to_supabase(
    supabase_client,
    audio_file_id: str,
    user_id: str,
    e1_turns: list,
    e2_output: dict,
    e3_agents_output: dict
):
    """
    E5 — Persistência Definitiva.
    Pega os fragmentos validados pelo E4 e divide nas tabelas específicas.
    1. conversation_turns
    2. conversation_entities
    3. checklist_results
    4. objections
    5. lost_opportunities
    6. conversation_analysis (Full JSONB)
    """
    try:
        # 1. conversation_turns (Salvar falas)
        turns_data = [
            {
               "audio_file_id": audio_file_id,
               "turn_index": t.turn_index,
               "role": t.role,
               "text": t.text,
               "start_time": getattr(t, "start_time", 0.0),
               "end_time": getattr(t, "end_time", getattr(t, "char_end", 0.0))
            } for t in e1_turns
        ]
        if turns_data:
            supabase_client.table("conversation_turns").insert(turns_data).execute()
            
        # 2. conversation_analysis (Bloco gigante condensado JSONB)
        full_analysis = {
            "metrics": e2_output.get("metrics", {}),
            "phases": e2_output.get("phases", []),
            "agent3_intent": e3_agents_output.get("agent3", {}),
            "agent4_sentiment": e3_agents_output.get("agent4", {}),
            "agent5_profile": e3_agents_output.get("agent5", {}),
            "agent7_synthesis": e3_agents_output.get("agent7", {})
        }
        
        supabase_client.table("conversation_analysis").insert({
            "audio_file_id": audio_file_id,
            "analysis_data": full_analysis,
            "overall_score": 0.0 # Será computado posteriormente pela UI ou Synthesis
        }).execute()
        
        # 3. checklist_results (Mistura E2 deterministico + E3 Agente 1)
        checklist_items = []
        checklist_items.extend(e2_output.get("checklist_evidence", []))
        
        a1_output = e3_agents_output.get("agent1", {})
        if isinstance(a1_output, dict) and "items" in a1_output:
            checklist_items.extend(a1_output["items"])
            
        for item in checklist_items:
            # Garanta injetar o foreign key do audio
            item["audio_file_id"] = audio_file_id
            
        if checklist_items:
            supabase_client.table("checklist_results").insert(checklist_items).execute()
            
        # 4. objections (E3 Agente 2)
        objections = e3_agents_output.get("agent2", {}).get("items", [])
        if objections:
             for obj in objections: obj["audio_file_id"] = audio_file_id
             supabase_client.table("objections").insert(objections).execute()
             
        # 5. lost_opportunities (E3 Agente 6)
        lost_opps = e3_agents_output.get("agent6", {})
        if lost_opps:
             supabase_client.table("lost_opportunities").insert({
                 "audio_file_id": audio_file_id,
                 "data": lost_opps
             }).execute()
             
        # 6. conversation_entities (E2 Entities)
        entities = e2_output.get("entities", {})
        if entities:
            supabase_client.table("conversation_entities").insert({
                "audio_file_id": audio_file_id,
                "entities_json": entities
            }).execute()
            
        logger.info(f"E5 Persistência concluída c/ sucesso para {audio_file_id}.")
        return True
    
    except Exception as e:
        logger.error(f"E5 Persistência falhou dolorosamente: {str(e)}")
        # Em producao idealmente fariamos um rollback, mas Supabase PostgREST 
        # trata inserts separadamente se nao usar RPC atomic transaction.
        raise e
