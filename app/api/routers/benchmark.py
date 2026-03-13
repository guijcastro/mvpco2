"""
api/routers/benchmark.py — Rota para a Fase A.2 (Batalha Visual Lado-a-Lado)
"""
import asyncio
import os
import json
from pathlib import Path
from fastapi import APIRouter, Header, HTTPException, Depends
from pydantic import BaseModel
import litellm

# Importa as funções do runner que já decifram as chaves
from benchmark.runner import load_keys_from_supabase, inject_env_keys, load_prompt, _validate_schema

router = APIRouter(prefix="/api/benchmark", tags=["benchmark"])

class DuelRequest(BaseModel):
    agent_id: str
    model_a: str
    model_b: str

async def get_jwt_token(authorization: str = Header(None)) -> str:
    """Extrai JWT do header 'Authorization: Bearer <token>'."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token JWT ausente ou inválido.")
    return authorization.split(" ")[1]

async def run_single_model(provider: str, model: str, system: str, user: str, schema: dict) -> dict:
    """Executa o LiteLLM para um único modelo e valida o schema."""
    try:
        response = await litellm.acompletion(
            model=model,
            messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
            response_format={"type": "json_object"},
            temperature=0.0,
            timeout=90,
        )
        content = response.choices[0].message.content or ""
        try:
            parsed = json.loads(content)
            schema_valid, schema_errors = _validate_schema(parsed, schema)
            return {
                "model": model,
                "status": "ok",
                "parsed_json": parsed,
                "schema_valid": schema_valid,
                "schema_errors": schema_errors,
                "raw_content": content,
                "latency": response._response_ms if hasattr(response, "_response_ms") else 0
            }
        except json.JSONDecodeError as e:
            return {"model": model, "status": "error", "error": f"JSON inválido: {e}", "raw_content": content}
    except Exception as e:
        return {"model": model, "status": "error", "error": str(e)}

@router.post("/duel")
async def benchmark_duel(req: DuelRequest, token: str = Depends(get_jwt_token)):
    """
    Roda os dois LLMs paralelamente (Modelo A e B) para a mesma transcrição configurada
    no json do `agent_id` correspondente. Usado no benchmark_visual.html.
    """
    try:
        # 1. Carregar e injetar as chaves do Supabase
        keys = load_keys_from_supabase(token)
        inject_env_keys(keys)
        
        # 2. Mapeamento de provedores (o frontend manda string ex: 'gpt-5.2', precisamos saber o provider)
        provider_a = "openai" if "gpt" in req.model_a.lower() else ("anthropic" if "claude" in req.model_a.lower() else ("google" if "gemini" in req.model_a.lower() else "xai"))
        provider_b = "openai" if "gpt" in req.model_b.lower() else ("anthropic" if "claude" in req.model_b.lower() else ("google" if "gemini" in req.model_b.lower() else "xai"))

        # 3. Carregar o Prompt
        system_prompt, user_prompt, expected_schema = load_prompt(req.agent_id)

        # 4. Disparar em paralelo
        res_a, res_b = await asyncio.gather(
            run_single_model(provider_a, req.model_a, system_prompt, user_prompt, expected_schema),
            run_single_model(provider_b, req.model_b, system_prompt, user_prompt, expected_schema)
        )

        return {
            "agent_id": req.agent_id,
            "model_a": res_a,
            "model_b": res_b
        }
        
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Prompt não encontrado para agente '{req.agent_id}'.")
    except RuntimeError as re:
        raise HTTPException(status_code=400, detail=str(re))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro interno no erro de duelo: {e}")
