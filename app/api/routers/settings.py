"""
api/routers/settings.py — Endpoints de configuração de chaves de API
Permite ao usuário salvar, listar e deletar suas chaves LLM via frontend.

Endpoints:
  GET  /api/settings/keys          — lista provedores configurados (sem revelar a chave)
  POST /api/settings/keys          — salva ou atualiza chave de um provedor
  DELETE /api/settings/keys/{provider} — remove chave de um provedor
  POST /api/settings/keys/test     — testa se a chave está funcional
"""

from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel, Field
from typing import Optional
import os

from supabase import create_client, Client
from utils.encryption import encrypt_api_key, decrypt_api_key, make_key_hint, EncryptionError

router = APIRouter(tags=["settings"])

PROVIDERS = ["openai", "anthropic", "google", "xai"]


def _supabase(authorization: str) -> Client:
    """Cria cliente Supabase com o JWT do usuário (garante RLS)."""
    token = authorization.replace("Bearer ", "").strip()
    client: Client = create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_KEY"],
    )
    client.auth.set_session(token, "")
    return client


# ── Schemas ──────────────────────────────────────────────────────────────────

class SaveKeyRequest(BaseModel):
    provider: str = Field(..., pattern=r"^(openai|anthropic|google|xai)$")
    api_key: str  = Field(..., min_length=10)


class KeyStatus(BaseModel):
    provider: str
    configured: bool
    key_hint: Optional[str] = None
    is_active: bool = True


class TestKeyRequest(BaseModel):
    provider: str


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/api/settings/keys", response_model=list[KeyStatus])
async def list_keys(authorization: str = Header(...)):
    """Retorna lista de provedores com status de configuração (sem revelar chaves)."""
    sb = _supabase(authorization)
    res = sb.table("user_api_keys").select("provider, key_hint, is_active").execute()
    configured = {r["provider"]: r for r in (res.data or [])}

    return [
        KeyStatus(
            provider=p,
            configured=p in configured,
            key_hint=configured[p]["key_hint"] if p in configured else None,
            is_active=configured[p]["is_active"] if p in configured else False,
        )
        for p in PROVIDERS
    ]


@router.post("/api/settings/keys", status_code=200)
async def save_key(body: SaveKeyRequest, authorization: str = Header(...)):
    """Criptografa e salva (ou atualiza) a chave de API de um provedor."""
    try:
        encrypted = encrypt_api_key(body.api_key)
        hint = make_key_hint(body.api_key)
    except EncryptionError as e:
        raise HTTPException(status_code=500, detail=str(e))

    sb = _supabase(authorization)
    user = sb.auth.get_user()
    if not user or not user.user:
        raise HTTPException(status_code=401, detail="Não autorizado")

    user_id = user.user.id

    # Upsert (insert se não existe, update se existe)
    sb.table("user_api_keys").upsert({
        "user_id":       user_id,
        "provider":      body.provider,
        "encrypted_key": encrypted,
        "key_hint":      hint,
        "is_active":     True,
    }, on_conflict="user_id,provider").execute()

    return {"ok": True, "provider": body.provider, "hint": hint}


@router.delete("/api/settings/keys/{provider}", status_code=200)
async def delete_key(provider: str, authorization: str = Header(...)):
    """Remove a chave de um provedor."""
    if provider not in PROVIDERS:
        raise HTTPException(status_code=400, detail=f"Provedor inválido: {provider}")

    sb = _supabase(authorization)
    sb.table("user_api_keys").delete().eq("provider", provider).execute()
    return {"ok": True, "provider": provider}


@router.post("/api/settings/keys/test")
async def test_key(body: TestKeyRequest, authorization: str = Header(...)):
    """Testa se a chave configurada para o provedor está funcional (chamada mínima)."""
    if body.provider not in PROVIDERS:
        raise HTTPException(status_code=400, detail="Provedor inválido")

    sb = _supabase(authorization)
    res = sb.table("user_api_keys").select("encrypted_key").eq("provider", body.provider).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail=f"Chave para '{body.provider}' não configurada")

    try:
        plain_key = decrypt_api_key(res.data[0]["encrypted_key"])
    except EncryptionError as e:
        raise HTTPException(status_code=500, detail=str(e))

    # Teste mínimo por provedor
    try:
        import litellm
        # Modelos usados no teste do botão — rápidos e baratos
        test_models = {
            "openai":    "gpt-5.2",                 # "ChatGPT 5.2" conforme base/restrito
            "anthropic": "claude-haiku-4-5",
            "google":    "gemini/gemini-2.5-pro",   # Gemini 2.5
            "xai":       "xai/grok-3-mini",
        }
        model = test_models[body.provider]

        # Variáveis de ambiente que o litellm usa internamente
        env_map = {
            "openai":    "OPENAI_API_KEY",
            "anthropic": "ANTHROPIC_API_KEY",
            "google":    "GOOGLE_API_KEY",   # litellm lê GOOGLE_API_KEY (não GEMINI_API_KEY)
            "xai":       "XAI_API_KEY",
        }
        import os
        os.environ[env_map[body.provider]] = plain_key

        response = await litellm.acompletion(
            model=model,
            messages=[{"role": "user", "content": "Responda apenas: OK"}],
            max_tokens=5,
            timeout=15,
        )
        return {"ok": True, "provider": body.provider, "model_tested": model}

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Chave inválida ou provedor indisponível: {str(e)}")
