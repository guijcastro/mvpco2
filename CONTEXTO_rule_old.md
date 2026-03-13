# CONTEXTO — Guia de Restauração de Contexto para IA

> **Este é o primeiro arquivo que a IA deve ler ao iniciar qualquer sessão.**
> Antes de qualquer ação, leia este arquivo, depois `PLANEJAMENTO.md`, depois `INDICE.md`, depois o `docs/entrega_faseN.md` mais recente.

---

## 1. Identidade do Projeto

| Campo | Valor |
|-------|-------|
| Nome | MVPCO — Cliente Oculto para Varejo Ótico Premium |
| Pasta local | `C:\Users\User\.gemini\antigravity\scratch\MVPCO\app\` |
| Repositório | https://github.com/guijcastro/mvpco |
| Supabase URL | https://kikhexoxlkzofccnnkze.supabase.co |
| Referência | `C:\Users\User\.gemini\antigravity\scratch\MVPCO\base\` (NÃO é o projeto — só referência) |

---

## 2. Stack do Projeto

| Camada | Tecnologia |
|--------|-----------|
| Frontend | HTML + Vanilla JS (sem framework) |
| Servidor local | Bun (WSL, porta 8888) — só faz proxy para FastAPI |
| **API de análise** | **Python FastAPI (porta 8001)** |
| **NLP** | **spaCy pt_core_news_lg** |
| **Agentes LLM** | **litellm** (OpenAI, Anthropic, Gemini, xAI) |
| **Validação** | **Pydantic v2** |
| Banco | Supabase (PostgreSQL + Auth + Storage) |
| Deploy | Netlify (frontend) + Railway/Render (FastAPI) |

> [!CAUTION]
> NENHUMA análise é feita em JavaScript. O JS é exclusivo para frontend.
> Toda análise, parsing, agentes LLM e persistência rodam no Python FastAPI.

---

## 3. Como Restaurar o Contexto (passo a passo)

Ao iniciar uma nova sessão, execute SEMPRE esta sequência:

```
1. Leia CONTEXTO.md          ← este arquivo
2. Leia PLANEJAMENTO.md      ← arquitetura, premissas, stack
3. Leia INDICE.md            ← mapa de todos os arquivos (✅ existe / ❌ pendente)
4. Liste docs/               ← veja quais entregas já existem (entrega_faseN.md)
5. Leia o entrega_faseN.md   ← da fase mais recente (o que foi feito, aprovado, rejeitado)
6. Leia o docs/faseN.md      ← da fase atual (checklist de tarefas)
7. Continue de onde parou    ← sem duplicar o que já foi feito
```

---

## 4. Arquivos de Entrega de Fase (OBRIGATÓRIOS)

Ao concluir cada fase, a IA **obrigatoriamente** cria:

```
docs/entrega_fase1.md
docs/entrega_fase_ai_benchmark.md
docs/entrega_fase_benchmark_visual.md
docs/entrega_fase_parsing.md
docs/entrega_fase2.md
docs/entrega_fase3.md
docs/entrega_fase4.md
docs/entrega_fase5.md
```

Esses arquivos são a **memória persistente de execução**. Sem eles, o contexto se perde e o trabalho pode ser duplicado.

**Template:** [`docs/TEMPLATE_ENTREGA.md`](docs/TEMPLATE_ENTREGA.md)

### Regra: nenhuma fase começa sem o entrega da fase anterior

```
❌ ERRADO: começar Fase 2 sem criar docs/entrega_fase_parsing.md
✅ CERTO:  criar docs/entrega_fase_parsing.md → checar aprovação do usuário → começar Fase 2
```

---

## 5. Regras Absolutas do Projeto

1. **Análise só em Python** — nunca em JavaScript
2. **LLM nunca recebe transcrição inteira** — contexto mínimo por agente
3. **Schema imutável após Fase 1** — mudanças exigem migração de dados
4. **SQL é manual** — a IA gera, o usuário executa no painel do Supabase
5. **Ontologia é humana** — JSONs de config exigem revisão manual
6. **Fase só avança com validação humana** — todos os itens do checklist devem ser confirmados
7. **Arquivo de entrega é obrigatório** — sem ele, a fase não está concluída
8. **NUNCA deletar ou sobrescrever arquivo finalizado** — ver regra abaixo

### Regra 8 — Preservação de Arquivos (INVIOLÁVEL)

> [!CAUTION]
> **A IA NUNCA pode deletar, sobrescrever ou editar diretamente um arquivo que já foi finalizado e aprovado.**
> Qualquer alteração solicitada após a finalização DEVE seguir este fluxo:

```
1. Renomear o arquivo original: arquivo.ext → arquivo_old.ext
2. Copiar o conteúdo original para o novo arquivo_old.ext (intacto)
3. Criar o novo arquivo.ext com as modificações solicitadas
4. Ao final da fase: mover todos os *_old.* para a pasta Old/ da fase
```

**Exemplo prático:**
```
# Usuário pede modificação em api/main.py após finalizado:

1. Renomear: api/main.py → api/main_old.py  (cópia fiel do original)
2. Criar:    api/main.py  (versão com a modificação)
3. Final da fase: mover api/main_old.py → api/Old/main_old.py
```

**Onde criar a pasta Old/:**
- Para arquivos em `api/`: → `api/Old/`
- Para arquivos em `public/`: → `public/Old/`
- Para arquivos em `supabase/`: → `supabase/Old/`
- Para arquivos em `docs/`: → `docs/Old/`
- Para arquivos na raiz: → `Old/` (raiz do projeto)

---

## 6. Premissas e Decisões do Usuário (Histórico)

> Esta seção é atualizada a cada sessão quando o usuário toma uma decisão importante.

| Data | Decisão | Status |
|------|---------|--------|
| 09/03/2026 | Stack: Python FastAPI para toda análise (sem análise em JS) | ✅ Aprovado |
| 09/03/2026 | `MVPCO/base/` é apenas referência — projeto novo do zero em `app/` | ✅ Aprovado |
| 09/03/2026 | Repositório `guijcastro/mvpco` aponta para `app/` — `base/` fora do git | ✅ Aprovado |
| 09/03/2026 | IAs a testar: ChatGPT, Claude (mais recente), Gemini 2.5, Grok | ✅ Aprovado |
| 09/03/2026 | Scripts SQL executados manualmente pelo usuário no painel Supabase | ✅ Aprovado |
| 09/03/2026 | Arquivo de confirmação de entrega obrigatório por fase | ✅ Aprovado |
| 09/03/2026 | **NUNCA sobrescrever arquivo finalizado** — criar `_old` antes de modificar; mover `Old/` ao fim da fase | ✅ Aprovado |
| 10/03/2026 | Inclusão de Fase A.2 (Batalha Lado-a-Lado) para avaliação qualitativa via GUI. | ✅ Aprovado |
| 10/03/2026 | Alteração do escopo do benchmark: Restrição do teste exclusivamente aos high-end models (GPT-5.2, Claude Sonnet 4.6, Gemini 2.5 Pro, Grok-3). | ✅ Aprovado |
| 10/03/2026 | **Refatoração do Plano de Execução:** Inversão da Fase A.2 com a Fase B. O modelo de Batalha (A.2) está ⏸️ PAUSADO até que o sistema adquira a capacidade transcrever arquivos reais do negócio (Upload/Parsing — Fase B). | ✅ Aprovado |

---

## 7. Estado Atual

> Atualizar a cada sessão.

**Última atualização:** 10/03/2026

**Fase atual:** Fase A.1 concluída (Benchmark CLI). Transição aprovada para a **Fase B — Parsing (Áudio, Transcrição e Testes)**. Fase A.2 encontra-se parcialmente construída mas PAUSADA.

**Próxima ação:** Iniciar execução e desenvolvimento da Fase B (`docs/fase_parsing.md`), focada na recepção de áudios reais e transformação destes dados em insumos para a classificação.

**Arquivos de entrega existentes:**
- `docs/entrega_fase1.md` — ✅ Aprovado (09/03/2026)
- `docs/entrega_fase_ai_benchmark.md` — ✅ Aprovado (10/03/2026)
- `docs/entrega_fase_benchmark_visual.md` — ⏸️ Pausado (aguardando Fase B)
