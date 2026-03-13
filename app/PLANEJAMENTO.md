# MVPCO — Memória do Projeto

> **SEQUÊNCIA DE LEITURA OBRIGATÓRIA:** `../CONTEXTO.md` → `PLANEJAMENTO.md` → `INDICE.md` → `docs/entrega_faseN.md` (mais recente) → `docs/faseN.md` (fase atual)

> [!CAUTION]
> **REGRA ESTRITA (MANDATÓRIA): A IA DEVE OBRIGATORIAMENTE PEDIR AUTORIZAÇÃO PARA CADA MODIFICAÇÃO DE ARQUITETURA OU ABORDAGEM E NÃO PODE FAZER NENHUMA ALTERAÇÃO ATÉ QUE O USUÁRIO AUTORIZE EXPRESSAMENTE.**

## Identidade do Projeto

| Campo | Valor |
|-------|-------|
| Nome | Sistema de Cliente Oculto — Varejo Ótico Premium |
| Repositório | https://github.com/guijcastro/mvpco |
| Supabase URL | https://kikhexoxlkzofccnnkze.supabase.co |
| Pasta local | `C:\Users\User\.gemini\antigravity\scratch\MVPCO\app` |
| Referência (NÃO é o projeto) | `C:\Users\User\.gemini\antigravity\scratch\MVPCO\base` |

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
| **Fase A.1 — Benchmark IA (Infra e Custos)** | 🔴 NÃO INICIADA | — |
| **Fase B — Parsing: Áudio, Transcrição, Testes e Validação** | 🔴 NÃO INICIADA | — |
| **Fase A.2 — Batalha de Modelos (Benchmark Visual)** | 🔴 NÃO INICIADA (Com Pendências) | — |
| Fase 2 — Pipeline de Classificação | 🟡 PENDENTE DE VALIDAÇÃO (Transcrições Vazias) | — |
| Fase 3 — Relatórios Estruturados | 🔴 NÃO INICIADA | — |
| Fase 4 — Inteligência Avançada | 🔴 NÃO INICIADA | — |
| Fase 5 — Ecossistema e Escala | 🔴 NÃO INICIADA | — |

### 🛑 Parada Estratégica & Registro de Pendências (Fase 2)
⚠️ **Ponto de Parada Atual:** O desenvolvimento foi pausado na transição de estabilização entre a extração determinística (E1/E2) e a execução / persistência paralela dos agentes LLM (E3 a E5).

**Erros Críticos Encontrados na Sessão:**
1. **Erro de Permissão RLS:** A rota `routers/analyze.py` não conseguia acessar os payloads JSON salvos porque a leitura de background barrava as políticas do Supabase (`parsed_data not found in transcriptions`).
2. **Erro de Pydantic vs Gemini Schema:** A API do Gemini 2.5 rejeitava repetitivamente a orquestração dos agentes 6 e 7, falhando com `"additionalProperties is not supported"` por causa de propriedades `dict` indefinidas na modelagem `schemas/analysis.py`.
3. **Erro de Extração de Métricas (E5):** O script `e5_persist.py` falhava no mapeamento de timestamps (`AttributeError`) pois tentava ler chaves `start_time` não enviadas pelo extrator semântico.
4. **Erro de Escopo de API Key (E4 Validator):** O SDK do Gemini estrava disparando Erros de `INVALID_API_KEY` nos agentes porque o Client estava sendo instanciado globalmente com dados nulos antes da chave real do Supabase pingar na porta.
5. **Erro de Colunas/Tabelas Inexistentes (E5 Persist):** O Supabase explodia com código `PGRST204` ao final de tudo, pois nós escrevemos o código de inserção em Python paras as 6 tabelas analíticas (`conversation_turns`, `objections`, etc), mas as tabelas ainda não existiam fisicamente criadas no banco.

**Detalhamento do Que Está em Aberto (Pendências):**
- [ ] **A VALIDAÇÃO DA IA ESTÁ PENDENTE:** As soluções estruturais e de código implementadas hoje nos agentes, scripts de banco de dados (`phase2_tables_setup.sql`), e o instanciamento dinâmico no validador E4 **AINDA NÃO FORAM VALIDADAS** pelo Product Owner. Sua eficácia não é garantida e deve constar como não-finalizada.
- [ ] **Teste de Performance na Transcrição (Base64):** Após reverter a abordagem para os moldes originais injetando os dados de memória, será necessário validar se o Gemini STT voltou a apresentar a eficácia de 70% sem cortar/resumir as transcrições brutalmente.
- [ ] **Executar o Pipeline Ponta a Ponta:** É necessário disparar um áudio do zero, aguardar a transcrição e confirmar se todos os 7 agentes finalizam sem timeout, gerando a gravação bem-sucedida das métricas e das 6 tabelas novas no Supabase.

## Premissas Absolutas

1. **Supabase novo** — Nenhuma tabela existe. Tudo criado do zero via scripts SQL manuais.
2. **Scripts SQL = manuais** — Antigravity gera os `.sql`. Você executa no painel do Supabase.
3. **Análise = Python** — `api/` contém toda a lógica. Bun apenas proxeia `/api/*` para `localhost:8001`.
4. **Ontologia = humana** — Os 3 JSONs de Fase 1 exigem revisão manual item a item. Sem isso, a Fase 2 não começa.
5. **LLM nunca recebe transcrição inteira** — Cada agente recebe contexto mínimo e responde uma pergunta com schema Pydantic obrigatório.
6. **Validação por fase** — Nenhuma fase começa sem checklist da fase anterior aprovado pelo usuário.
7. **Schema imutável após Fase 1** — Mudanças de schema exigem migração de dados e refatoração de agentes. Invista tempo antes de codar.
8. **Arquivo de entrega obrigatório** — Ao concluir cada fase, criar `docs/entrega_faseN.md` usando o template `docs/TEMPLATE_ENTREGA.md`. Sem este arquivo, a fase não está concluída.
9. **NUNCA sobrescrever arquivo finalizado** — Ao receber pedido de modificação em arquivo já aprovado, a IA DEVE: (1) renomear o original para `nome_old.ext`, (2) criar `nome.ext` com as mudanças. Ao final da fase, todos os `*_old.*` são movidos para `Old/` dentro da pasta do arquivo.
10. **PERMISSÃO EXPLÍCITA PARA CÓDIGO (NOVA REGRA MÁXIMA):** Daqui em diante, TODA E QUALQUER MODIFICAÇÃO de código, configuração ou arquitetura exige autorização explícita PRÉVIA do usuário. A IA nunca deve realizar ajustes no código por antecipação ao pedir permissão ou discutir abordagens.

## Sistema de Entrega e Controle

> [!CAUTION]
> **Regra inegociável:** A IA não avança para a próxima fase sem criar o arquivo de entrega e receber aprovação explícita do usuário.

### Fluxo de conclusão de cada fase:
```
1. Executar todas as tarefas da fase
2. Criar docs/entrega_faseN.md (a partir de docs/TEMPLATE_ENTREGA.md)
3. Preencher: atividades realizadas, decisões, adaptações ao plano,
   aprovações e rejeições do usuário durante a fase
4. Apresentar ao usuário para aprovação
5. Só após aprovação: commit com tag faseN-completa e avançar
```

### Arquivos de entrega por fase:
| Fase | Arquivo de entrega | Status |
|------|--------------------|--------|
| Fase 1 | `docs/entrega_fase1.md` | 🔴 Pendente |
| Fase A.1 | `docs/entrega_fase_ai_benchmark.md` | 🔴 Pendente |
| Fase B | `docs/entrega_fase_parsing.md` | 🔴 Pendente |
| Fase A.2 | `docs/entrega_fase_benchmark_visual.md` | ⏸️ Pausado (Aguardando Fase B) |
| Fase 2 | `docs/entrega_fase2.md` | 🟡 Pendente de Validação |
| Fase 3 | `docs/entrega_fase3.md` | 🔴 Pendente |
| Fase 4 | `docs/entrega_fase4.md` | 🔴 Pendente |
| Fase 5 | `docs/entrega_fase5.md` | 🔴 Pendente |

**Template:** [docs/TEMPLATE_ENTREGA.md](docs/TEMPLATE_ENTREGA.md)
**Guia de restauração de contexto:** [../CONTEXTO.md](../CONTEXTO.md) ← na raiz MVPCO/

## Estrutura de Pastas

```
MVPCO/                       ← RAIZ DO PROJETO
├── CONTEXTO.md              ← Guia de restauração de contexto para IA (LER PRIMEIRO)
├── base/                    ← Referência — NÃO é o projeto
└── app/                     ← CÓDIGO DO PROJETO (git: guijcastro/mvpco)
    ├── PLANEJAMENTO.md      ← ESTE ARQUIVO
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
    ├── TEMPLATE_ENTREGA.md  ← Template obrigatório de entrega
    ├── fase1.md → fase5.md  ← Plano detalhado de cada fase
    ├── fase_ai_benchmark.md ← Benchmark script
    ├── fase_benchmark_visual.md ← Batalha visual qualitativa
    ├── fase_parsing.md
    └── entrega_faseN.md     ← Criado ao concluir cada fase (começa vazio)
```

## Como iniciar o projeto localmente

```bash
# Terminal 1 — Frontend (Bun)
cd /mnt/c/Users/User/.gemini/antigravity/scratch/MVPCO/app
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

**Contexto e planejamento:**
- [../CONTEXTO.md](../CONTEXTO.md) — Restauração de contexto para IA (LER PRIMEIRO — está na raiz MVPCO/)
- [INDICE.md](INDICE.md) — Mapa de todos os arquivos
- [docs/TEMPLATE_ENTREGA.md](docs/TEMPLATE_ENTREGA.md) — Template de entrega de fase

**Fases do projeto:**
- [Fase 1 — Fundação](docs/fase1.md)
- [Fase A.1 — Benchmark de IAs (Infra)](docs/fase_ai_benchmark.md)
- [Fase B — Parsing: Áudio, Transcrição e Validação](docs/fase_parsing.md)
- [Fase A.2 — Batalha de Modelos (Visual)](docs/fase_benchmark_visual.md) *(Aguardando Fase B)*
- [Fase 2 — Pipeline de Classificação](docs/fase2.md)
- [Fase 3 — Relatórios Estruturados](docs/fase3.md)
- [Fase 4 — Inteligência Avançada](docs/fase4.md)
- [Fase 5 — Ecossistema e Escala](docs/fase5.md)
