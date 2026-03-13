# FASE 4 — Inteligência Avançada

> Leia [PLANEJAMENTO.md](../PLANEJAMENTO.md). Pré-requisito: [Fase 3](fase3.md) 100% validada.

## Status

🔴 **NÃO INICIADA**

## Objetivo

Funcionalidades de diferenciação competitiva: busca semântica com pgvector, análise preditiva, construtor de checklist personalizável, alertas automáticos e integração CRM. Cobre funcionalidades **#13–#21, #23–#24, #30, #33, #39** do docx.

---

## A1. Busca Semântica — Biblioteca de Melhores Práticas (#18 do docx)

### `supabase/06_pgvector.sql` — [ ] Pendente (Antigravity gera, usuário executa)

```sql
-- Habilitar extensão
CREATE EXTENSION IF NOT EXISTS vector;

-- Adicionar coluna de embedding em conversation_turns
ALTER TABLE conversation_turns ADD COLUMN embedding vector(1536);

-- Índice para busca aproximada (HNSW — mais rápido que IVFFlat)
CREATE INDEX ON conversation_turns USING hnsw (embedding vector_cosine_ops);

-- Nova tabela para busca semântica
CREATE TABLE semantic_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  turn_id UUID REFERENCES conversation_turns(id),
  context TEXT,          -- turno + contexto dos 2 turnos anteriores
  embedding vector(1536),
  tags TEXT[],           -- ['objecao_preco', 'cross_sell', 'fechamento']
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX ON semantic_library USING hnsw (embedding vector_cosine_ops);
```

### `api/routers/semantic.py` — [ ] Pendente

```python
from openai import AsyncOpenAI

async def embed_transcription(transcription_id: str):
    """
    Após análise, gera embeddings para cada turno e salva no Supabase.
    Usa text-embedding-3-small (menor custo, 1536 dims).
    """
    client = AsyncOpenAI()
    # Busca turnos, gera embeddings em batch, salva na tabela
    ...

async def semantic_search(query: str, user_id: str, top_k: int = 5):
    """
    POST /api/semantic/search
    Converte query em embedding → nearest neighbor search no Supabase.
    Retorna os turnos mais similares de outros atendimentos.
    """
    embedding = await _embed_text(query)
    results = supabase.rpc("match_semantic_library", {
        "query_embedding": embedding,
        "match_count": top_k,
        "user_id": user_id
    }).execute()
    return results.data
```

**UI:** Página de busca em `public/relatorio.html` — campo de texto livre → retorna turnos similares com contexto e link para o atendimento de origem.

**Critério:** Busca por "cliente resistente ao preço" retorna ≥ 3 turnos relevantes de atendimentos reais.

---

## A2. Análise Preditiva (#39 do docx)

### `api/pipeline/predictive.py` — [ ] Pendente

```python
import pandas as pd
from supabase import Client

def compute_predictive_scores(transcription_id: str, supabase: Client) -> dict:
    """
    Calcula scores preditivos baseados em padrões históricos:
    - churn_risk: baseado em intent_score + objections não resolvidas
    - best_follow_up_window: baseado em urgency + follow_up_promised
    - projected_ticket: baseado em produtos detectados + histórico de conversão
    
    Usa pandas para agregação e análise dos últimos 30 atendimentos.
    Sem LLM — puro cálculo estatístico sobre dados históricos.
    """
    # Busca histórico dos últimos 30 atendimentos do mesmo store
    history = supabase.table("conversation_analysis").select(...).limit(30).execute()
    df = pd.DataFrame([r["analysis_data"] for r in history.data])

    # Churn risk: alta se intent < 40 E objections não resolvidas > 1
    # Best follow-up: moda de horários de conversão pelo histórico
    # Projected ticket: média de ticket de clientes com perfil similar
    ...
```

**Critério:** Score exibido na página de análise com ≥ 10 atendimentos históricos. Cálculo feito em < 500ms.

---

## A3. Construtor de Checklist Personalizável (#13, #5.2 do docx)

### `supabase/07_custom_checklists.sql` — [ ] Pendente

```sql
CREATE TABLE custom_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  items JSONB NOT NULL,  -- array com mesma estrutura do checklist_zeiss_v6.json
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE custom_checklists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_isolation" ON custom_checklists FOR ALL USING (auth.uid() = user_id);
```

### `api/routers/checklists.py` — [ ] Pendente

- `POST /api/checklists` — criar novo checklist
- `GET /api/checklists` — listar checklists do usuário
- `PUT /api/checklists/{id}` — atualizar
- `DELETE /api/checklists/{id}` — remover

O pipeline `e2_extractor.py` deve receber o `checklist_id` opcional e usar o checklist customizado ao invés do Zeiss padrão.

**UI em `public/settings.html`:**
- Listagem dos checklists do usuário
- Formulário: nome, itens com campos para keywords/peso/role/window
- Botão "Usar este checklist na próxima análise"

**Critério:** Checklist customizado criado via UI e executado com sucesso em análise.

---

## A4. Detector de Momentos Críticos Aprimorado (#33 do docx)

### Extensão do Agente 3 — [ ] Pendente

O Agente 3 (`agent3_intent.py`) passa a retornar a evolução do `intent_score` turno a turno, não apenas o score final:

```python
class IntentEvolution(BaseModel):
    turn_index: int
    turn_role: str
    intent_delta: float    # variação em relação ao turno anterior
    trigger: Optional[str] # o que causou a variação

class IntentResult(BaseModel):
    # ... campos existentes ...
    intent_evolution: List[IntentEvolution]  # NOVO
    critical_moments: List[CriticalMoment]   # TURNAROUND, PERDA, etc.
```

**UI:** Gráfico de linha em `analise.html` mostrando a evolução do score com marcadores nos momentos críticos.

---

## A5. Alertas e Notificações (#30 do docx)

### `api/routers/alerts.py` — [ ] Pendente

- Sistema de regras configuráveis: `score < 50`, `objection_type = PRECO_ALTO AND efficacy = NAO_CONTORNOU`
- Supabase Realtime: trigger após insert em `conversation_analysis`
- Endpoint: `POST /api/alerts/rules` — criar regra; `GET /api/alerts/history` — histórico

**UI em `public/settings.html`:**
- Listagem de regras ativas
- Formulário para criar nova regra
- Badge no menu com contador de alertas não lidos

**Critério:** Alerta disparado e exibido após análise com score abaixo do threshold.

---

## A6. Integração CRM/ERP (#23 do docx)

### `api/routers/webhooks.py` — [ ] Pendente

- Configuração de URL do webhook + header de autenticação na página de Settings
- Após cada análise: `POST <webhook_url>` com payload:
```json
{
  "event": "analysis_completed",
  "transcription_id": "...",
  "vendor_name": "...",
  "store_name": "...",
  "checklist_score": 72.5,
  "intent_classification": "PRONTO",
  "summary": "3-5 linhas do Agente 7",
  "timestamp": "2026-03-09T13:00:00Z"
}
```
- Compatível com: Salesforce, HubSpot, RD Station (URL configurável)
- Retry automático com backoff exponencial em caso de falha

**Critério:** Webhook mockado (webhook.site) recebe evento após análise.

---

## A7. Gestão do Catálogo de Produtos (#24 do docx)

### `api/routers/catalog.py` — [ ] Pendente

- `GET/PUT /api/catalog` — ler e atualizar `product_catalog.json` (salvo em banco, não em arquivo)
- Nova tabela `product_catalog` no Supabase (Antigravity gera SQL)

**UI em `public/settings.html`:**
- Tabela editável com produtos, keywords e valores estimados
- Adicionar, editar e remover produtos
- Mudanças refletem imediatamente na próxima análise

---

## Checklist de Validação da Fase 4

> [!CAUTION]
> **A Fase 5 só começa após TODOS os itens confirmados.**

- [ ] `06_pgvector.sql` executado → extensão `vector` ativa no Supabase
- [ ] Embeddings gerados para atendimentos da Fase 2
- [ ] Busca semântica retorna resultados relevantes para query de teste
- [ ] Score preditivo exibido em atendimento com ≥ 10 históricos
- [ ] Checklist customizado criado via UI e executado com sucesso
- [ ] Evolução de intent_score exibida como gráfico de linha
- [ ] Alerta dispara após análise com score abaixo do threshold configurado
- [ ] Webhook CRM recebe payload (verificado via webhook.site)
- [ ] Produto adicionado via catálogo UI detectado em nova análise
- [ ] Commit com tag `fase4-completa`

**→ Quando validado, avançar para [docs/fase5.md](fase5.md)**
