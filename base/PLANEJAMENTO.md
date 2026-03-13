# MVPCO — Memória do Projeto

> **Este arquivo é a fonte da verdade.** Antes de qualquer ação, leia este arquivo e o MD da fase atual em `docs/faseN.md`.

## Identidade do Projeto

| Campo | Valor |
|-------|-------|
| Nome | Sistema de Cliente Oculto — Varejo Ótico Premium |
| Repositório | https://github.com/guijcastro/mvpco |
| Supabase URL | https://kikhexoxlkzofccnnkze.supabase.co |
| Pasta local | `C:\Users\User\.gemini\antigravity\scratch\MVPCO\base` |

## Stack Definitivo

| Camada | Tecnologia | Justificativa |
|--------|-----------|---------------|
| Frontend | HTML + Vanilla JS | Estático, sem framework |
| Servidor de arquivos (local) | **Bun** (WSL) | Serve frontend + proxy para FastAPI |
| **API de análise** | **Python + FastAPI** | spaCy, pandas, pydantic, openai SDK |
| **NLP determinístico** | **spaCy (pt_core_news_lg)** | Tokenização, NER, POS, dependências sintáticas |
| **Agentes LLM** | **Python openai + litellm** | Multi-provider (GPT-4, Gemini) |
| **Schema validation** | **Pydantic v2** | Validação rigorosa de output dos agentes |
| Banco | **Supabase** (PostgreSQL + Auth + Storage) | RLS por usuário |
| Deploy frontend | **Netlify CDN** | Build estático |
| Deploy API | **Railway / Render / Fly.io** | Python FastAPI containerizado |
| Scripts SQL | Executados **manualmente** pelo usuário | No painel SQL do Supabase |

> [!IMPORTANT]
> **REGRA ABSOLUTA:** Nenhuma análise é feita em JavaScript. O JS é exclusivo para frontend (renderização, upload, navegação). Toda lógica de parsing, NLP, agentes LLM e persistência roda no serviço Python FastAPI.

## Estado Atual do Projeto

> **Atualize esta seção a cada fase concluída.**

| Fase | Status | Tag Git |
|------|--------|---------|
| Fase 1 — Fundação e Infraestrutura | 🔴 NÃO INICIADA | — |
| **Fase A — Benchmark de IAs** (ChatGPT, Claude, Gemini, Grok) | 🔴 NÃO INICIADA | — |
| **Fase B — Parsing: Testes e Validação** | 🔴 NÃO INICIADA | — |
| Fase 2 — Pipeline de Classificação | 🔴 NÃO INICIADA | — |
| Fase 3 — Relatórios Estruturados | 🔴 NÃO INICIADA | — |
| Fase 4 — Inteligência Avançada | 🔴 NÃO INICIADA | — |
| Fase 5 — Ecossistema e Escala | 🔴 NÃO INICIADA | — |

## Premissas Absolutas

1. **Supabase novo** — Nenhuma tabela existe. Tudo criado do zero via scripts SQL manuais.
2. **Scripts SQL = manuais** — Antigravity gera os `.sql`. Você executa no painel do Supabase.
3. **Análise = Python** — `api/` contém toda a lógica. Bun apenas proxeia `/api/*` para `localhost:8001`.
4. **Ontologia = humana** — Os 3 JSONs de Fase 1 exigem revisão manual item a item. Sem isso, a Fase 2 não começa.
5. **LLM nunca recebe transcrição inteira** — Cada agente recebe contexto mínimo e responde uma pergunta com schema Pydantic obrigatório.
6. **Validação por fase** — Nenhuma fase começa sem checklist da fase anterior aprovado pelo usuário.
7. **Schema imutável após Fase 1** — Mudanças de schema exigem migração de dados e refatoração de agentes. Invista tempo antes de codar.

## Estrutura de Pastas

```
MVPCO/base/
├── PLANEJAMENTO.md          ← ESTE ARQUIVO
├── bun_server.js            ← Serve frontend + proxeia /api/* para FastAPI:8001
├── netlify.toml             ← Build config para deploy Netlify (frontend)
├── package.json             ← Dependências JS mínimas (supabase-js para frontend)
├── .env                     ← Vars locais (NUNCA subir no git)
│
├── public/                  ← Frontend estático
│   ├── login.html
│   ├── index.html           ← Dashboard
│   ├── upload.html          ← Upload de áudio
│   ├── analise.html         ← Análise individual (9 módulos)
│   ├── relatorio.html       ← Relatórios históricos + benchmarking
│   └── js/
│       ├── config.js        ← SUPABASE_URL, SUPABASE_KEY, API_BASE
│       └── charts.js        ← Chart.js helpers
│
├── api/                     ← Python FastAPI (TODA a análise aqui)
│   ├── main.py              ← App FastAPI + CORS + startup
│   ├── requirements.txt     ← fastapi, uvicorn, spacy, openai, supabase, pydantic, litellm, pandas
│   ├── .env                 ← SUPABASE_URL, SUPABASE_KEY, OPENAI_API_KEY, GEMINI_API_KEY
│   ├── routers/
│   │   ├── transcribe.py    ← POST /api/transcribe
│   │   ├── analyze.py       ← POST /api/analyze-v2
│   │   ├── chat.py          ← POST /api/chat
│   │   └── reports.py       ← GET /api/reports/*
│   ├── pipeline/
│   │   ├── e1_parser.py     ← Parsing de turnos (spaCy + regex)
│   │   ├── e2_extractor.py  ← Extração determinística (NER, keywords, métricas)
│   │   ├── e3_agents.py     ← Orquestrador dos 7 agentes LLM
│   │   ├── e4_validator.py  ← Validação Pydantic + re-execução automática
│   │   └── e5_persist.py    ← Persistência nas 6 tabelas + telemetria
│   ├── agents/
│   │   ├── agent1_checklist.py
│   │   ├── agent2_objections.py
│   │   ├── agent3_intent.py
│   │   ├── agent4_sentiment.py
│   │   ├── agent5_profile.py
│   │   ├── agent6_opportunities.py
│   │   └── agent7_synthesis.py
│   ├── schemas/
│   │   ├── turns.py         ← ConversationTurn, ParsedTranscription
│   │   ├── analysis.py      ← FullAnalysisOutput (20 top-level keys)
│   │   └── agents.py        ← Pydantic schemas por agente
│   └── config/
│       ├── checklist_zeiss_v6.json
│       ├── product_catalog.json
│       └── objection_taxonomy.json
│
├── supabase/                ← Scripts SQL para execução manual
│   ├── 01_auth_and_storage.sql
│   ├── 02_base_tables.sql
│   ├── 03_classification_tables.sql
│   ├── 04_rls_policies.sql
│   └── 05_reporting_views.sql
│
└── docs/                    ← Memória detalhada por fase
    ├── fase1.md
    ├── fase2.md
    ├── fase3.md
    ├── fase4.md
    └── fase5.md
```

## Como iniciar o projeto localmente

```bash
# Terminal 1 — Frontend (Bun)
cd /mnt/c/Users/User/.gemini/antigravity/scratch/MVPCO/base
bun run bun_server.js   # http://localhost:8888

# Terminal 2 — API Python (FastAPI)
cd api
pip install -r requirements.txt
python -m spacy download pt_core_news_lg
uvicorn main:app --reload --port 8001  # http://localhost:8001
```

## Template de Prompt para o Antigravity (Seção 6.1 do docx)

Quando retomar o trabalho em uma nova sessão, use este template:

```
CONTEXTO:
- Runtime frontend: Bun (porta 8888, serve public/)
- Runtime análise: Python FastAPI (porta 8001, api/)
- Banco: Supabase kikhexoxlkzofccnnkze (RLS por usuário)
- Toda lógica de análise em Python — NUNCA em JavaScript
- Schemas Pydantic: ver api/schemas/
- Ontologia: ver api/config/

TAREFA: [descrever o que construir]

RESTRIÇÕES:
- Não quebrar endpoints existentes
- Manter RLS alinhado ao padrão existente
- Schema de output dos agentes: ver docs/fase2.md Seção "Schema Completo"

CRITÉRIO DE ACEITAÇÃO: [condição específica de conclusão]
```

## Ordem de Dependências (Seção 6.2 do docx)

| ID | Tarefa | Dep. | Resp. |
|----|--------|------|-------|
| T1.1 | JSONs de ontologia | — | **MANUAL** |
| T1.2 | Scripts SQL (tabelas + RLS) | T1.1 | Antigravity gera / Manual executa |
| T1.3 | `e1_parser.py` + `e2_extractor.py` + testes | T1.1 + T1.2 | Antigravity |
| T2.1 | FastAPI `main.py` + router `/analyze-v2` | T1.3 | Antigravity |
| T2.2 | Agentes 1–4 | T2.1 | Antigravity |
| T2.3 | Agentes 5–7 | T2.1 | Antigravity (paralelo T2.2) |
| T2.4 | Telemetria + botão dashboard | T2.2 + T2.3 | Antigravity |
| T3.1 | Views SQL | T2.4 | Antigravity gera / Manual executa |
| T3.2 | Refatorar 9 módulos HTML | T3.1 | Antigravity |

## Links Rápidos

- [Fase 1 — Fundação](docs/fase1.md)
- [**Fase A — Benchmark de IAs**](docs/fase_ai_benchmark.md) ← nova
- [**Fase B — Parsing: Testes e Validação**](docs/fase_parsing.md) ← nova
- [Fase 2 — Pipeline de Classificação](docs/fase2.md)
- [Fase 3 — Relatórios Estruturados](docs/fase3.md)
- [Fase 4 — Inteligência Avançada](docs/fase4.md)
- [Fase 5 — Ecossistema e Escala](docs/fase5.md)
