# ÍNDICE COMPLETO DO PROJETO — MVPCO

> Mapa de todos os arquivos existentes e pendentes. Atualizar conforme o projeto avança.
> Leia junto com [PLANEJAMENTO.md](PLANEJAMENTO.md) para o contexto estratégico.

---

## Sequência de Fases

```
Fase 1 (Fundação) → Fase A (Benchmark IA) → Fase B (Parsing) → Fase 2 (Pipeline) → Fase 3 → Fase 4 → Fase 5
```

**Plano detalhado de cada fase:**
- [docs/fase1.md](docs/fase1.md) — Fundação: servidores, Supabase, ontologia
- [docs/fase_ai_benchmark.md](docs/fase_ai_benchmark.md) — Benchmark: ChatGPT, Claude, Gemini, Grok
- [docs/fase_parsing.md](docs/fase_parsing.md) — Testes e validação do parser
- [docs/fase2.md](docs/fase2.md) — Pipeline E1→E5, 7 agentes LLM
- [docs/fase3.md](docs/fase3.md) — Relatórios estruturados (SQL views)
- [docs/fase4.md](docs/fase4.md) — Inteligência avançada (pgvector, preditivo)
- [docs/fase5.md](docs/fase5.md) — Ecossistema e escala

---

## Mapa de Arquivos

### 📄 Documentação e Planejamento

| Arquivo | Status | Descrição |
|---------|--------|-----------|
| `PLANEJAMENTO.md` | ✅ Existe | Memória raiz do projeto — leia primeiro |
| `INDICE.md` | ✅ Este arquivo | Mapa de todos os arquivos |
| `PLANEJAMENTO_ESTRATEGICO.md` | ✅ Existe | Documento estratégico do projeto |
| `CLASSIFICACAO_DADOS.md` | ✅ Existe | Mapeamento dos dados de classificação |
| `AI_Audio_Analyst_Documentation.md` | ✅ Existe | Documentação do projeto base |
| `AGENTS.md` / `CLAUDE.md` | ✅ Existe | Instruções para agentes AI |
| `README_WSL.md` | ✅ Existe | Instruções para rodar via WSL |
| `docs/fase1.md` | ✅ Existe | Plano Fase 1 com checklist de validação |
| `docs/fase_ai_benchmark.md` | ✅ Existe | Plano Fase A com benchmark de IAs |
| `docs/fase_parsing.md` | ✅ Existe | Plano Fase B com suite de testes |
| `docs/fase2.md` | ✅ Existe | Plano Fase 2 com todos os 7 agentes |
| `docs/fase3.md` | ✅ Existe | Plano Fase 3 com SQL views |
| `docs/fase4.md` | ✅ Existe | Plano Fase 4 com pgvector e CRM |
| `docs/fase5.md` | ✅ Existe | Plano Fase 5 com multi-tenant e API |

---

### ⚙️ Servidor e Configuração

| Arquivo | Status | Descrição |
|---------|--------|-----------|
| `bun_server.js` | ✅ Existe | Servidor Bun (serve frontend + proxy para FastAPI) |
| `netlify.toml` | ✅ Existe | Configuração de deploy Netlify |
| `package.json` | ✅ Existe | Dependências JS |
| `pricing.json` | ✅ Atualizado | Preços dos modelos LLM (OpenAI, Claude, Gemini, Grok) |
| `.env` | ✅ Existe | Credenciais Supabase (não sobe no git) |
| `.gitignore` | ✅ Existe | Ignora node_modules, .env, etc. |

---

### 🌐 Frontend (`public/`)

| Arquivo | Status | Descrição |
|---------|--------|-----------|
| `public/login.html` | ✅ Existe | Login via Supabase Auth |
| `public/dashboard.html` | ✅ Existe | Dashboard principal |
| `public/upload.html` | ✅ Existe | Upload de áudio |
| `public/relatorio.html` | ✅ Existe | **Dashboard de telemetria** (tokens, custo, latência por modelo) |
| `public/relatorio_dinamico.html` | ✅ Existe | Relatório dinâmico de análises |
| `public/chat.html` | ✅ Existe | Interface de chat com transcrição |
| `public/logs.html` | ✅ Existe | Logs de chat |
| `public/settings.html` | ✅ Existe | Configurações (modelos, chaves, pricing) |
| `public/manual_analysis.html` | ✅ Existe | Análise manual |
| `public/js/config.js` | ⚠️ Verificar | Config Supabase URL/Key |
| `public/analise.html` | ❌ Pendente | Página de análise individual (9 módulos) — Fase 2 |

---

### 🔧 Backend — Netlify Functions (JS — apenas transcrição e chat)

| Arquivo | Status | Descrição |
|---------|--------|-----------|
| `netlify/functions/transcribe.js` | ✅ Existe | Transcrição via Whisper/Gemini |
| `netlify/functions/chat.js` | ✅ Existe | Chat multi-turn com transcrição |
| `netlify/functions/analyze-v2/` | ❌ Pendente | **Migrar para Python FastAPI** — Fase 2 |

---

### 🐍 Backend — Python FastAPI (`api/`) — **A criar na Fase 1+**

| Arquivo | Status | Fase |
|---------|--------|------|
| `api/main.py` | ❌ Pendente | Fase 1 |
| `api/requirements.txt` | ❌ Pendente | Fase 1 |
| `api/routers/transcribe.py` | ❌ Pendente | Fase 1 |
| `api/routers/analyze.py` | ❌ Pendente | Fase 2 |
| `api/routers/chat.py` | ❌ Pendente | Fase 2 |
| `api/routers/reports.py` | ❌ Pendente | Fase 3 |
| `api/routers/semantic.py` | ❌ Pendente | Fase 4 |
| `api/pipeline/e1_parser.py` | ❌ Pendente | Fase B (Parsing) |
| `api/pipeline/e2_extractor.py` | ❌ Pendente | Fase 2 |
| `api/pipeline/e3_agents.py` | ❌ Pendente | Fase 2 |
| `api/pipeline/e4_validator.py` | ❌ Pendente | Fase 2 |
| `api/pipeline/e5_persist.py` | ❌ Pendente | Fase 2 |
| `api/pipeline/predictive.py` | ❌ Pendente | Fase 4 |
| `api/agents/agent1_checklist.py` | ❌ Pendente | Fase 2 |
| `api/agents/agent2_objections.py` | ❌ Pendente | Fase 2 |
| `api/agents/agent3_intent.py` | ❌ Pendente | Fase 2 |
| `api/agents/agent4_sentiment.py` | ❌ Pendente | Fase 2 |
| `api/agents/agent5_profile.py` | ❌ Pendente | Fase 2 |
| `api/agents/agent6_opportunities.py` | ❌ Pendente | Fase 2 |
| `api/agents/agent7_synthesis.py` | ❌ Pendente | Fase 2 |
| `api/schemas/turns.py` | ❌ Pendente | Fase 1 |
| `api/schemas/analysis.py` | ❌ Pendente | Fase 2 |
| `api/schemas/agents.py` | ❌ Pendente | Fase 2 |
| `api/benchmark/runner.py` | ❌ Pendente | Fase A |
| `api/benchmark/report.py` | ❌ Pendente | Fase A |
| `api/benchmark/prompts/` (7 arquivos) | ❌ Pendente | Fase A |
| `api/tests/parsing/test_e1_parser.py` | ❌ Pendente | Fase B |
| `api/tests/parsing/corpus/` | ❌ Pendente | **MANUAL — transcrições reais** |
| `api/tests/parsing/ground_truth/` | ❌ Pendente | **MANUAL — labels corretos** |

---

### ⚙️ Ontologia (`api/config/` ou `src/config/`)

| Arquivo | Status | Fase |
|---------|--------|------|
| `api/config/checklist_zeiss_v6.json` | ❌ Pendente | Fase 1 — **REVISÃO MANUAL** |
| `api/config/product_catalog.json` | ❌ Pendente | Fase 1 — **REVISÃO MANUAL** |
| `api/config/objection_taxonomy.json` | ❌ Pendente | Fase 1 — **REVISÃO MANUAL** |

---

### 🗄️ SQL Scripts para Supabase

| Arquivo | Status | Fase | Localização atual |
|---------|--------|------|-------------------|
| `classification_setup.sql` | ✅ Existe | Base (legado) | raiz + `docs/sql/` |
| `create_bucket.sql` | ✅ Existe | Base (legado) | raiz + `docs/sql/` |
| `telemetry_setup.sql` | ✅ Existe | Base (legado) | raiz + `docs/sql/` |
| `supabase_rls_fix.sql` | ✅ Existe | Base (legado) | raiz + `docs/sql/` |
| `store_setup.sql` | ✅ Existe | Base (legado) | raiz + `docs/sql/` |
| `add_model_to_transcriptions.sql` | ✅ Existe | Base (legado) | raiz |
| `add_api_keys.sql` | ✅ Existe | Base (legado) | raiz |
| `supabase/01_auth_and_storage.sql` | ❌ Pendente | Fase 1 (novo Supabase) | — |
| `supabase/02_base_tables.sql` | ❌ Pendente | Fase 1 | — |
| `supabase/03_classification_tables.sql` | ❌ Pendente | Fase 1 | — |
| `supabase/04_rls_policies.sql` | ❌ Pendente | Fase 1 | — |
| `supabase/05_reporting_views.sql` | ❌ Pendente | Fase 3 | — |
| `supabase/06_pgvector.sql` | ❌ Pendente | Fase 4 | — |
| `supabase/07_custom_checklists.sql` | ❌ Pendente | Fase 4 | — |
| `supabase/08_organizations.sql` | ❌ Pendente | Fase 5 | — |

---

### 🧰 Scripts utilitários (existentes na raiz — podem ser aproveitados)

| Arquivo | Descrição |
|---------|-----------|
| `test_db.js` | Verifica conexão com o Supabase |
| `test_telemetry.js` | Testa inserção de telemetria |
| `test_models.js` | Testa modelos LLM |
| `cleanup_db.js` / `cleanup_db_node.js` | Limpa dados de teste |
| `fix_all.py` / `fix_navbar.py` | Scripts de manutenção de HTML |
| `push_to_github.sh` | Script de push |
| `run_gitnexus.sh` | GitNexus |
