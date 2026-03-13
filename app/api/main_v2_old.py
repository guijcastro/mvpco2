"""
api/main.py — MVPCO FastAPI Application
Roda na porta 8001 (Bun faz proxy de /api/* para cá)
"""

import time
import logging
from contextlib import asynccontextmanager
from pathlib import Path

# Carrega .env da pasta pai (app/.env) — obrigatório antes de qualquer import que use os.getenv
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / ".env")

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# ─── Logging ────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)
logger = logging.getLogger("mvpco")

# ─── State global da aplicação ──────────────────────────────────────────────
class AppState:
    nlp = None
    checklist: list = []
    product_catalog: list = []
    objection_taxonomy: list = []

state = AppState()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Carrega recursos ao iniciar o servidor."""
    import spacy, json

    # spaCy
    logger.info("Carregando modelo spaCy pt_core_news_lg...")
    try:
        state.nlp = spacy.load("pt_core_news_lg")
        logger.info("✅ spaCy carregado.")
    except OSError:
        logger.warning("⚠️  pt_core_news_lg não encontrado. Execute: python -m spacy download pt_core_news_lg")

    # Ontologia
    config_dir = Path(__file__).parent / "config"
    for fname, attr in [
        ("checklist_zeiss_v6.json", "checklist"),
        ("product_catalog.json",    "product_catalog"),
        ("objection_taxonomy.json", "objection_taxonomy"),
    ]:
        path = config_dir / fname
        if path.exists():
            setattr(state, attr, json.loads(path.read_text(encoding="utf-8")))
            logger.info(f"✅ {fname} carregado ({len(getattr(state, attr))} itens).")
        else:
            logger.warning(f"⚠️  {fname} não encontrado em {config_dir}")

    yield  # ← servidor rodando

    logger.info("Encerrando servidor MVPCO.")


# ─── App ────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="MVPCO Analysis API",
    version="2.0.0",
    description="Sistema de Cliente Oculto — Varejo Ótico Premium. Análise de atendimentos via spaCy + LLM.",
    lifespan=lifespan,
)

# CORS: aceita requisições do Bun local e do Netlify em produção
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8888",
        "http://127.0.0.1:8888",
        "https://*.netlify.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Middleware de logging de requests ──────────────────────────────────────
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    elapsed = round((time.perf_counter() - start) * 1000)
    logger.info(f"{request.method} {request.url.path} → {response.status_code} ({elapsed}ms)")
    return response


# ─── Health check ───────────────────────────────────────────────────────────
@app.get("/api/health", tags=["system"])
async def health():
    return {
        "status": "ok",
        "spacy_loaded": state.nlp is not None,
        "checklist_items": len(state.checklist),
        "products": len(state.product_catalog),
        "objection_types": len(state.objection_taxonomy),
    }


# ─── Routers ─────────────────────────────────────────────────────────────────
# Fase 1: settings router (chaves de API criptografadas)
from routers.settings import router as settings_router
app.include_router(settings_router)

# Fase 2+ (descomentar conforme as fases avançam):
# from routers.transcribe import router as transcribe_router
# from routers.analyze   import router as analyze_router
# from routers.chat      import router as chat_router
# from routers.reports   import router as reports_router
# app.include_router(transcribe_router, prefix="/api")
# app.include_router(analyze_router,   prefix="/api")
# app.include_router(chat_router,      prefix="/api")
# app.include_router(reports_router,   prefix="/api")

@app.get("/api/status", tags=["system"])
async def status():
    return {
        "phase": "Fase 1 — Fundação",
        "message": "API operacional. Settings ativo. Routers de análise na Fase 2.",
        "docs": "/docs",
    }
