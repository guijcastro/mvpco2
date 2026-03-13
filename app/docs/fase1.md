# FASE 1 — Fundação: Infraestrutura, Supabase e Ontologia

> Leia [PLANEJAMENTO.md](../PLANEJAMENTO.md) antes de começar. É o pré-requisito absoluto de todas as fases.

## Status

🔴 **NÃO INICIADA** — Última atualização: 09/03/2026

## Objetivo

Ter o ambiente completo operacional: servidor Bun + FastAPI rodando, autenticação via Supabase, 8 tabelas criadas com RLS, bucket de storage, e os 3 arquivos JSON de ontologia finalizados e aprovados pelo usuário.

> [!CAUTION]
> **Os 3 JSONs de ontologia são a única peça que exige conhecimento de domínio humano.**
> Dedique 2–3h revisando `checklist_zeiss_v6.json` antes de avançar.
> Um falso positivo em um item distorce o score de TODOS os atendimentos.

---

## Grupo A — Servidores e Infraestrutura Local

### A1. `bun_server.js` — [ ] Pendente

Servidor Bun que:
- Serve arquivos estáticos de `public/` (HTML, CSS, JS) na porta 8888
- Faz proxy de todas as requisições `/api/*` para `http://localhost:8001` (FastAPI)
- Carrega variáveis de `.env`

```js
// Exemplo de proxy de rota
if (req.url.startsWith('/api/')) {
  return fetch('http://localhost:8001' + req.url, { method: req.method, body: req.body, headers: req.headers });
}
```

**Critério:** `bun run bun_server.js` sobe na porta 8888 sem erros.

### A2. `api/main.py` — [ ] Pendente

Aplicação FastAPI com:
- CORS configurado para `http://localhost:8888` e domínio Netlify
- Startup: carrega modelos spaCy e JSONs de ontologia em memória
- Inclui todos os routers: `/api/transcribe`, `/api/analyze-v2`, `/api/chat`, `/api/reports`
- Middleware de logging de requests

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import spacy

app = FastAPI(title="MVPCO Analysis API")
nlp = None  # carregado no startup

@app.on_event("startup")
async def startup():
    global nlp
    nlp = spacy.load("pt_core_news_lg")
```

**Critério:** `uvicorn main:app --reload --port 8001` inicia sem erros. `/api/docs` acessível.

### A3. `api/requirements.txt` — [ ] Pendente

```
fastapi>=0.110.0
uvicorn[standard]>=0.27.0
spacy>=3.7.0
openai>=1.12.0
litellm>=1.20.0
supabase>=2.4.0
pydantic>=2.6.0
pandas>=2.2.0
python-dotenv>=1.0.0
httpx>=0.26.0
```

**Critério:** `pip install -r requirements.txt` e `python -m spacy download pt_core_news_lg` completam sem erros.

### A4. `netlify.toml` — [ ] Pendente

```toml
[build]
  publish = "public"

[[redirects]]
  from = "/api/*"
  to = "https://<RAILWAY_URL>/api/:splat"
  status = 200
  force = true
```

**Critério:** Arquivo válido (sem erro no `netlify deploy --dry-run`).

---

## Grupo B — Frontend Base

### B1. `public/js/config.js` — [ ] Pendente

```js
window.SUPABASE_URL = "https://kikhexoxlkzofccnnkze.supabase.co";
window.SUPABASE_KEY = "<anon-public-key>";
window.API_BASE = (location.hostname === 'localhost') ? 'http://localhost:8888' : '';
```

### B2. `public/login.html` — [ ] Pendente

- Formulário email + senha (login e cadastro em abas)
- SDK Supabase JS via CDN: `supabase.auth.signInWithPassword()`
- Redireciona para `index.html` após login
- Redireciona para `login.html` se sessão inválida

**Critério:** Login com conta de teste real funciona e redireciona.

### B3. `public/index.html` (Dashboard skeleton) — [ ] Pendente

- Menu: Dashboard / Upload / Análises / Relatórios / Configurações
- Verifica sessão; redireciona para `login.html` se expirada
- Seção de atividade recente (últimos 5 áudios analisados)

---

## Grupo C — Banco de Dados Supabase (Scripts Manuais)

> Todos os scripts abaixo são gerados pelo Antigravity e executados **por você** no [Painel SQL do Supabase](https://supabase.com/dashboard/project/kikhexoxlkzofccnnkze/sql).

### C1. `supabase/01_auth_and_storage.sql` — [ ] Pendente

```sql
-- Criar bucket 'audios' (público para leitura autenticada)
INSERT INTO storage.buckets (id, name, public) VALUES ('audios', 'audios', false);

-- Policy: usuário só acessa seus próprios arquivos
CREATE POLICY "User audio access" ON storage.objects
  FOR ALL USING (auth.uid()::text = (storage.foldername(name))[1]);
```

**Critério:** Bucket `audios` aparece no Storage do painel.

### C2. `supabase/02_base_tables.sql` — [ ] Pendente

Tabelas base do sistema:

```sql
CREATE TABLE audio_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  store_name TEXT,
  vendor_name TEXT,
  visit_date DATE,
  duration_seconds INTEGER,
  manual_review BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE transcriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audio_file_id UUID REFERENCES audio_files(id) NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  text TEXT NOT NULL,
  model TEXT,           -- 'whisper-1' | 'gemini-pro'
  language TEXT,
  cost_usd NUMERIC(10,6),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE usage_telemetry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  transcription_id UUID REFERENCES transcriptions(id),
  operation_type TEXT,  -- 'transcribe' | 'agent_1' | 'agent_2' ... 'agent_7'
  tokens_input INTEGER,
  tokens_output INTEGER,
  cost_usd NUMERIC(10,6),
  model TEXT,
  latency_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Critério:** 3 tabelas visíveis no Table Editor.

### C3. `supabase/03_classification_tables.sql` — [ ] Pendente

6 novas tabelas para o pipeline v2:

```sql
-- Turnos da conversa (output E1)
CREATE TABLE conversation_turns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transcription_id UUID REFERENCES transcriptions(id) NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  turn_index INTEGER NOT NULL,
  role TEXT CHECK (role IN ('VENDEDOR', 'CLIENTE', 'TERCEIRO')) NOT NULL,
  text TEXT NOT NULL,
  char_start INTEGER,
  char_end INTEGER,
  token_count INTEGER,
  confidence NUMERIC(3,2)  -- confiança do parser para este turno
);

-- Entidades detectadas (output E2)
CREATE TABLE conversation_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transcription_id UUID REFERENCES transcriptions(id) NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  entity_type TEXT,   -- 'product' | 'price' | 'brand' | 'competitor' | 'equipment'
  value TEXT,
  turn_id UUID REFERENCES conversation_turns(id),
  source TEXT DEFAULT 'DETERMINISTIC'
);

-- Resultados do checklist (E2 + Agente 1)
CREATE TABLE checklist_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transcription_id UUID REFERENCES transcriptions(id) NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  item_key TEXT NOT NULL,
  item_label TEXT,
  verdict TEXT CHECK (verdict IN ('SIM', 'NAO', 'INCONCLUSIVO')) NOT NULL,
  confidence NUMERIC(3,2),
  evidence TEXT,
  source TEXT,       -- 'DETERMINISTIC' | 'LLM_AGENT_1'
  weight INTEGER,
  turn_id UUID REFERENCES conversation_turns(id)
);

-- JSON consolidado completo (output E4+E5)
CREATE TABLE conversation_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transcription_id UUID REFERENCES transcriptions(id) NOT NULL UNIQUE,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  analysis_data JSONB NOT NULL,   -- 20 top-level keys (schema fixo da Fase 2)
  schema_version TEXT DEFAULT '2.0',
  parser_confidence NUMERIC(3,2),
  total_agent_cost_usd NUMERIC(10,6),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Objeções detectadas (Agente 2)
CREATE TABLE objections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transcription_id UUID REFERENCES transcriptions(id) NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  objection_type TEXT NOT NULL,
  objection_text TEXT,
  turn_id UUID REFERENCES conversation_turns(id),
  vendor_response_text TEXT,
  efficacy TEXT CHECK (efficacy IN ('CONTORNOU', 'NAO_CONTORNOU', 'PARCIAL')),
  phase TEXT
);

-- Oportunidades perdidas (Agente 6)
CREATE TABLE lost_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transcription_id UUID REFERENCES transcriptions(id) NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  opportunity_type TEXT,  -- 'cross_sell' | 'upsell' | 'implicit_need'
  product TEXT,
  estimated_value NUMERIC(10,2),
  client_signal TEXT
);
```

**Critério:** 6 tabelas visíveis no Table Editor.

### C4. `supabase/04_rls_policies.sql` — [ ] Pendente

```sql
-- Habilitar RLS em todas as tabelas
ALTER TABLE audio_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_telemetry ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_turns ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE objections ENABLE ROW LEVEL SECURITY;
ALTER TABLE lost_opportunities ENABLE ROW LEVEL SECURITY;

-- Policy padrão (SELECT, INSERT, UPDATE, DELETE) em todas as tabelas:
-- CREATE POLICY "user_isolation" ON <tabela>
--   FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
-- (Antigravity gera o SQL completo para cada tabela)
```

**Critério:** Usuário A logado não vê registros de Usuário B.

---

## Grupo D — Ontologia (Antigravity gera esqueleto → REVISÃO MANUAL)

### D1. `api/config/checklist_zeiss_v6.json` — [ ] Pendente

22 itens. Estrutura de cada item:

```json
{
  "item_key": "cumprimentou_cliente",
  "item_label": "Cumprimentou o cliente ao chegar",
  "keywords": ["boa tarde", "bem-vindo", "olá", "bom dia", "seja bem-vindo"],
  "role": "VENDEDOR",
  "window": "turns_0_3",
  "weight": 5,
  "requires_llm": false,
  "rationale": "Keywords diretas com alta confiança nas primeiras 4 falas do vendedor"
}
```

**15 itens determinísticos** (`requires_llm: false`):
`cumprimentou_cliente`, `perguntou_conhece_zeiss`, `pegou_oculos_lensometro`, `limpou_lens_wipes`, `usou_ultrassonico`, `perguntou_profissao`, `perguntou_eletronicos`, `perguntou_esportes`, `perguntou_dirige`, `perguntou_sensibilidade_luz`, `mencionou_iterminal_visufit`, `solicitou_telefone_email`, `ofertou_photofusion_antivirus`, `mencionou_zeiss_clareza`, `usou_app_visuconsult`

**7 itens LLM** (`requires_llm: true`):
`explicou_zeiss_com_clareza`, `realizou_medicao_com_equipamento`, `ofertou_lente_maior_valor_primeiro`, `demonstrou_interesse_genuino`, `utilizou_recurso_visual`, `consultou_tabela_precos`, `contato_pos_visita_7_dias`

> [!IMPORTANT]
> **REVISÃO MANUAL OBRIGATÓRIA** — Valide cada keyword contra transcrições reais antes de aprovar.

### D2. `api/config/product_catalog.json` — [ ] Pendente

```json
[
  { "id": "drivesafe", "label": "DriveSafe", "category": "lens_type", "estimated_value": 800,
    "keywords": ["DriveSafe", "drive safe", "dirigir", "visão noturna", "claridade ao volante"] },
  { "id": "photofusion", "label": "PhotoFusion", "category": "treatment", "estimated_value": 600,
    "keywords": ["PhotoFusion", "fotossensível", "muda de cor", "escurece no sol", "transitions"] },
  { "id": "iterminal", "label": "iTerminal", "category": "equipment", "estimated_value": 0,
    "keywords": ["iTerminal", "i terminal", "equipamento de medição", "medição digital"] },
  { "id": "visufit", "label": "Visufit", "category": "equipment", "estimated_value": 0,
    "keywords": ["Visufit", "visufit", "scanner facial"] },
  { "id": "visuconsult", "label": "VisuConsult", "category": "app", "estimated_value": 0,
    "keywords": ["VisuConsult", "visuconsult", "aplicativo", "app da Zeiss"] },
  { "id": "single_vision", "label": "Single Vision", "category": "lens_type", "estimated_value": 400,
    "keywords": ["monofocal", "single vision", "visão simples", "lente simples"] },
  { "id": "progressive", "label": "Progressive", "category": "lens_type", "estimated_value": 1200,
    "keywords": ["progressiva", "multifocal", "progressive", "lente progresiva"] }
]
```

> [!IMPORTANT]
> **REVISÃO MANUAL** — Adicione valores estimados reais e variações linguísticas do catálogo Zeiss.

### D3. `api/config/objection_taxonomy.json` — [ ] Pendente

9 tipos de objeção (mapeados da Seção 3, Agente 2 do docx):

```json
[
  { "type": "PRECO_ALTO", "label": "Preço alto",
    "definition": "Cliente expressa que o preço está acima do esperado",
    "examples": ["tá caro", "não tenho esse dinheiro", "é muito", "achei que era mais barato"] },
  { "type": "PRECO_SEM_CONTEXTO", "label": "Hesitação genérica",
    "definition": "Vou pensar sem objeção explícita — hesitação vaga",
    "examples": ["deixa eu pensar", "vou pensar", "preciso ver", "depois eu decido"] },
  { "type": "PRECISA_CONSULTAR_TERCEIRO", "label": "Precisa consultar terceiro",
    "definition": "Precisa falar com cônjuge, sócio ou parente",
    "examples": ["vou falar com meu marido", "preciso consultar minha esposa", "quero mostrar para minha filha"] },
  { "type": "JA_TEM_PRODUTO_SIMILAR", "label": "Já tem produto similar",
    "definition": "Já tem óculos recente ou produto equivalente",
    "examples": ["acabei de comprar", "tenho um novo", "comprei ano passado"] },
  { "type": "COMPARACAO_CONCORRENTE", "label": "Comparação com concorrente",
    "definition": "Menciona concorrente com preço ou qualidade favorável",
    "examples": ["na outra ótica era mais barato", "vi a Essilor por menos", "Varilux custa menos"] },
  { "type": "QUALIDADE_QUESTIONADA", "label": "Qualidade questionada",
    "definition": "Dúvida sobre durabilidade, procedência ou eficácia",
    "examples": ["será que dura?", "não conheço essa marca", "já ouvi dizer que risca"] },
  { "type": "URGENCIA_BAIXA", "label": "Urgência baixa",
    "definition": "Não está com pressa para decidir",
    "examples": ["só vim pesquisar", "não estou com pressa", "é para o futuro"] },
  { "type": "CONDICAO_PAGAMENTO", "label": "Condição de pagamento",
    "definition": "Questiona parcelamento, crédito ou entrada",
    "examples": ["tem parcela?", "aceita cartão?", "pode parcelar em 12x?", "qual a entrada?"] },
  { "type": "DESCONFIANCA_MARCA", "label": "Desconfiança na Zeiss",
    "definition": "Ceticismo específico sobre a marca Zeiss",
    "examples": ["não conheço Zeiss", "nunca ouvi falar", "é melhor que as outras?"] }
]
```

> [!IMPORTANT]
> **REVISÃO MANUAL** — Adicione exemplos reais de objeções que você já ouviu nas lojas.

---

## Checklist de Validação da Fase 1

> [!CAUTION]
> **A Fase 2 só começa após TODOS os itens abaixo confirmados pelo usuário.**

- [ ] `bun run bun_server.js` — sem erros na porta 8888
- [ ] `uvicorn api.main:app --port 8001` — `/api/docs` acessível no browser
- [ ] `bun install` + `pip install -r api/requirements.txt` — sem erros
- [ ] Login e logout via `public/login.html` funcionam com conta real do Supabase
- [ ] `public/index.html` carrega o dashboard após login
- [ ] Script `01_auth_and_storage.sql` executado → bucket `audios` visível no Storage
- [ ] Script `02_base_tables.sql` executado → `audio_files`, `transcriptions`, `usage_telemetry` visíveis
- [ ] Script `03_classification_tables.sql` executado → 6 novas tabelas visíveis
- [ ] Script `04_rls_policies.sql` executado → RLS testado com dois usuários distintos
- [ ] `checklist_zeiss_v6.json` — 22 itens revisados e aprovados pelo usuário
- [ ] `product_catalog.json` — variações linguísticas validadas
- [ ] `objection_taxonomy.json` — 9 tipos com exemplos reais aprovados
- [ ] Commit + push com tag `fase1-completa`

**→ Quando todos confirmados, avançar para [docs/fase2.md](fase2.md)**
