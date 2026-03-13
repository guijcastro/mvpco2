# FASE A.2 — Batalha de Modelos Lado-a-Lado (Benchmark Visual)

> Leia [PLANEJAMENTO.md](../PLANEJAMENTO.md). Esta fase foi adicionada em 10/03/2026 para permitir a avaliação qualitativa dos LLMs.

## Status

⏸️ **PAUSADA (Código parcialmente escrito)** — Aguardando a construção do Módulo de Upload de Áudio e Transcrição (Whisper) na Fase B para que a batalha utilize arquivos reais dos fones em vez de texto engessado de prompt.

## Posição no Plano Modificado

**Fase B (Upload/Parsing)** → **FASE A.2 (esta)** → **Fase 2 (Classificação)**

## Objetivo

Enquanto a Fase A.1 testou a resiliência de infraestrutura e o custo dos modelos, a **Fase A.2** constrói uma interface interativa para que o humano especialista (Usuário) possa avaliar o **raciocínio clínico** da Inteligência Artificial.

*Aviso:* O código *frontend* (`benchmark_visual.html`) e *backend* (`routers/benchmark.py`) já foram previamente esboçados. Contudo, esta fase encontra-se pausada pois não faz sentido os modelos julgarem "transcrições fixas (mocks)". O teste só retornará e a Rota do FastAPI será finalizada assim que a Fase B estiver funcional, injetando o áudio real enviado pelo usuário no duelo lado-a-lado.

---

## Entregáveis da Fase A.2

### 1. Banco de Dados: Votos de Avaliação
- **Script SQL:** `supabase/06_benchmark_votes.sql`
- **Objetivo:** Criar tabela `benchmark_votes` (RLS habilitado) para registrar permanentemente qual modelo o usuário considerou vencedor em cada embate.
- **Campos:** `id`, `user_id`, `agent_id`, `model_a`, `model_b`, `winner_model` (ou "empate"), `notes`.

### 2. Backend: Rota Dinâmica de Batalha
- **Arquivo:** `api/routers/benchmark.py`
- **Funcionalidade:** Endpoint `POST /api/benchmark/duel` que recebe a requisição do frontend.
- **Lógica:**
  1. Carrega o prompt de teste de `api/benchmark/prompts/{agent_id}.json`.
  2. Dispara, via `asyncio.gather()`, duas requisições paralelas ao LiteLLM (uma para o Modelo A, outra para o Modelo B).
  3. Retorna os dois JSONs gerados para o frontend.

### 3. Frontend: Interface Split View
- **Arquivo:** `public/benchmark_visual.html`
- **Funcionalidade:** 
  - Header contendo seletores: Agente (1 a 7), Modelo A, Modelo B.
  - Tela dividida em duas colunas verticais exibindo o JSON retornado formatado ou renderizado (estruturado).
  - Componente de votação na parte inferior: "Modelo A Venceu" / "Empate" / "Modelo B Venceu".
  - Comunicação assíncrona com o Supabase para gravar a decisão na tabela `benchmark_votes`.

---

## Integração com o Ecossistema

Esta fase atualizará o `api/main.py` da Fase 1, já que precisará incluir o novo `benchmark_router` para receber comandos do frontend que chegam via Bun (porta 8888).

Nenhuma alteração é neccesária no `bun_server.js`, pois o proxy genérico `/api/*` já redireciona tudo livremente para o FastAPI na porta 8001.

---

## Checklist de Validação da Fase A.2

> [!CAUTION]
> **A Fase B (Parsing) só começa após a conclusão desta fase para validar qual modelo iremos engessar nos prompts.**

- [ ] Arquivo `06_benchmark_votes.sql` executado no Supabase.
- [ ] Rota `POST /api/benchmark/duel` criada e vinculada ao `main.py`.
- [ ] Página `public/benchmark_visual.html` responsiva criada.
- [ ] Usuário consegue selecionar Agente 2, colocar GPT-4o-mini vs Claude Haiku e ver as saídas na tela.
- [ ] Voto salvo com sucesso na tabela `benchmark_votes` via Javascript do lado cliente.
- [ ] Documento `docs/entrega_fase_benchmark_visual.md` gerado.

**→ Quando validado, avançar para [docs/fase_parsing.md](fase_parsing.md)**
