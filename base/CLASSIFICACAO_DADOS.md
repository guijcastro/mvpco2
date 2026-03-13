# PLANO INTEGRAL DO SISTEMA — AI AUDIO ANALYST
## Cobertura Total das 40 Funcionalidades: Arquitetura Quantitativa e Qualitativa

**Legenda:**
- 🟦 **QUANT** — Dados extraídos diretamente do banco, sem IA
- 🟣 **QUAL** — Extração via IA a partir da transcrição (módulo configurável)
- 🔀 **HÍBRIDO** — IA extrai, banco agrega em relatórios quantitativos

---

## FUNDAÇÃO: MODELO DE DADOS GLOBAL

Todo o sistema se apoia nestas camadas:

```
CAMADA 1 — INFRAESTRUTURA OPERACIONAL
   stores, vendors, missions, product_catalog, users, devices

CAMADA 2 — COLETA DE DADOS
   audio_files, transcriptions, manual_observations, audit_photos

CAMADA 3 — INTELIGÊNCIA (IA)
   classification_modules (configurável pelo usuário)
   analysis_results (resultados JSONB de cada módulo)

CAMADA 4 — RELATÓRIOS
   QUANTITATIVOS → queries no banco (camadas 1 e 2)
   QUALITATIVOS  → leitura do JSONB da camada 3
   HÍBRIDOS      → cruzamento entre camadas 2, 3 e dados de CRM/PDV
```

---

## SCHEMA COMPLETO DO BANCO

### Tabelas Operacionais (Camada 1)

```sql
-- Hierarquia de lojas
CREATE TABLE regions   (id UUID PK, name TEXT, country TEXT);
CREATE TABLE stores    (id UUID PK, region_id UUID→regions, name TEXT, address TEXT, phone TEXT, manager_user_id UUID);

-- Vendedores
CREATE TABLE vendors   (id UUID PK, store_id UUID→stores, user_id UUID, name TEXT,
                        hire_date DATE, cost_per_hour NUMERIC, is_active BOOL);

-- Missões / Campanhas de Cliente Oculto
CREATE TABLE missions  (id UUID PK, user_id UUID, store_id UUID→stores, title TEXT,
                        type TEXT,  -- 'cliente_oculto', 'monitoramento', 'qualidade', 'pos_venda'
                        checklist_module_id UUID→classification_modules,
                        start_date DATE, end_date DATE, status TEXT);  -- 'ativa', 'concluida', 'pausada'

-- Catálogo de produtos
CREATE TABLE product_catalog (
    id UUID PK, user_id UUID, name TEXT, category TEXT, brand TEXT,
    price_base NUMERIC, margin_pct NUMERIC,
    complementary_ids UUID[],   -- IDs de produtos de cross-sell
    upsell_ids UUID[],          -- Versões superiores
    keywords TEXT[],            -- Palavras mencionadas pelo cliente que indicam interesse
    arguments JSONB             -- {"feature": "argumento de venda"}
);

-- Dispositivos de gravação
CREATE TABLE recording_devices (
    id UUID PK, store_id UUID→stores, name TEXT, type TEXT,
    battery_pct INTEGER, free_space_mb INTEGER, last_sync_at TIMESTAMP,
    status TEXT  -- 'online', 'offline', 'charging'
);

-- Consentimento de gravação (LGPD)
CREATE TABLE consent_log (
    id UUID PK, audio_id UUID→audio_files, method TEXT,  -- 'qr_code', 'manual', 'app'
    consented_at TIMESTAMP, ip_text TEXT
);
```

### Tabelas de Coleta (Camada 2)

```sql
-- Extensão da tabela audio_files existente
ALTER TABLE audio_files ADD COLUMN IF NOT EXISTS
    vendor_id        UUID REFERENCES vendors(id),
    mission_id       UUID REFERENCES missions(id),
    outcome          TEXT CHECK (outcome IN ('venda', 'sem_venda', 'pendente')),
    sale_amount      NUMERIC,      -- Valor da venda (preenchido pelo usuário ou via PDV)
    duration_seconds INTEGER,      -- Calculado no upload
    discount_pct     NUMERIC,      -- % de desconto concedido
    followup_done    BOOLEAN DEFAULT false,
    followup_date    DATE,
    notes            TEXT;         -- Anotações livres do auditor

-- Observações de auditoria (checklist físico da loja)
CREATE TABLE audit_observations (
    id UUID PK, audio_id UUID→audio_files, user_id UUID,
    category TEXT,     -- 'apresentacao_pessoal', 'limpeza_loja', 'iluminacao', etc.
    score INTEGER,     -- 1 a 5
    note TEXT,
    created_at TIMESTAMP
);

-- Fotos da auditoria
CREATE TABLE audit_photos (
    id UUID PK, audio_id UUID→audio_files, user_id UUID,
    category TEXT, storage_path TEXT, caption TEXT, created_at TIMESTAMP
);

-- Follow-ups
CREATE TABLE followups (
    id UUID PK, audio_id UUID→audio_files, vendor_id UUID→vendors,
    scheduled_at TIMESTAMP, completed_at TIMESTAMP,
    channel TEXT,    -- 'whatsapp', 'ligacao', 'email'
    outcome TEXT,    -- 'converteu', 'nao_converteu', 'sem_resposta'
    notes TEXT
);

-- Anotações em trechos da transcrição
CREATE TABLE transcript_annotations (
    id UUID PK, audio_id UUID→audio_files, user_id UUID,
    char_start INTEGER, char_end INTEGER,  -- posição no texto
    note TEXT, color TEXT, created_at TIMESTAMP
);

-- Bookmarks no áudio
CREATE TABLE audio_bookmarks (
    id UUID PK, audio_id UUID→audio_files, user_id UUID,
    timestamp_sec INTEGER, label TEXT, created_at TIMESTAMP
);
```

### Tabelas de Inteligência (Camada 3)

```sql
-- Módulos de classificação configuráveis pelo usuário
CREATE TABLE classification_modules (
    id UUID PK, user_id UUID,
    name TEXT, description TEXT, icon TEXT, color TEXT,
    system_prompt TEXT NOT NULL,    -- Editável pelo usuário
    output_schema JSONB NOT NULL,   -- Define campos esperados no retorno
    report_fields JSONB,            -- [{key, label, type, chart, aggregation}]
    execution_trigger TEXT,         -- 'sempre', 'venda', 'sem_venda', 'manual'
    is_active BOOL DEFAULT true,
    is_template BOOL DEFAULT false,
    version INTEGER DEFAULT 1,
    created_at TIMESTAMP, updated_at TIMESTAMP
);

-- Resultados de cada análise modular
CREATE TABLE analysis_results (
    id UUID PK, audio_id UUID→audio_files, user_id UUID,
    module_id UUID→classification_modules,
    module_name TEXT, module_version INTEGER,
    system_prompt_snapshot TEXT,    -- Cópia do prompt usado
    result_json JSONB NOT NULL,     -- JSON validado retornado pela IA
    model_used TEXT, cost_usd NUMERIC, latency_ms INTEGER,
    created_at TIMESTAMP
);

-- Melhores práticas curadas
CREATE TABLE practice_library (
    id UUID PK, user_id UUID, audio_id UUID→audio_files,
    title TEXT, description TEXT, tags TEXT[],
    situation TEXT,   -- 'contorno_objeco_preco', 'cross_sell', 'fechamento', etc.
    is_public BOOL DEFAULT false,
    created_at TIMESTAMP
);

-- Alertas configurados pelo usuário
CREATE TABLE alert_rules (
    id UUID PK, user_id UUID, name TEXT,
    module_id UUID→classification_modules, field_key TEXT,
    condition TEXT,     -- 'menor_que', 'maior_que', 'igual_a'
    threshold TEXT,
    notification_type TEXT,  -- 'email', 'push', 'webhook'
    notification_target TEXT,
    is_active BOOL DEFAULT true
);

-- Disparos de alerta
CREATE TABLE alert_events (
    id UUID PK, rule_id UUID→alert_rules, audio_id UUID→audio_files,
    field_value TEXT, triggered_at TIMESTAMP, sent BOOL
);
```

---

## MAPEAMENTO COMPLETO DAS 40 FUNCIONALIDADES

---

### 1. CAPTURA E GESTÃO DE ÁUDIO

| Sub-item | Tipo | Fonte de dado | O que precisa ser feito |
|----------|------|---------------|------------------------|
| Gravação de áudio | Operacional | `audio_files` | App mobile / PWA com MediaRecorder API (futura) |
| Upload manual | Operacional | `audio_files` | ✅ Já implementado |
| Ativação/desativação via app | Operacional | `recording_devices` | App mobile — escopo futuro |
| Sincronização automática | Operacional | Supabase Storage | ✅ Já funciona no upload |
| Criação de missões | 🟦 QUANT | `missions` | Criar tabela + página `missoes.html` |
| Metadata (loja, vendedor, data, missão) | 🟦 QUANT | `audio_files` + joins | Adicionar campos `vendor_id`, `mission_id` no upload |
| QR Code para iniciar gravação | Operacional | — | Gerar QR com link pré-configurado para upload de missão específica |
| Marcação de pausas | 🟦 QUANT | `audio_bookmarks` | UI de timestamp durante gravação/reprodução |
| Anotações durante gravação | 🟦 QUANT | `audio_files.notes` | Campo de texto no upload |
| Gestão de dispositivos | 🟦 QUANT | `recording_devices` | Página de gestão de dispositivos |

**Relatórios desta seção:**
- 🟦 Total de áudios por missão / loja / período
- 🟦 Status de dispositivos (bateria, conectividade)
- 🟦 Taxa de adesão (missões criadas vs áudios entregues)

---

### 2. PROCESSAMENTO DE ÁUDIO

| Sub-item | Tipo | Fonte de dado | O que precisa ser feito |
|----------|------|---------------|------------------------|
| Transcrição texto | 🟦 QUANT | `transcriptions` | ✅ Já implementado |
| Identificação de falantes (diarização) | 🟣 QUAL | `transcriptions.segments_json` | API AssemblyAI / pyannote — campo `speaker_id` por segmento |
| Timestamps por fala | 🟦 QUANT | `transcriptions.segments_json` | Retornado pela API de diarização |
| Detecção de silêncios | 🟣 QUAL | `analysis_results` | Módulo IA: "identifique pausas > 3s e seu contexto" |
| Limpeza de ruídos | Operacional | Pré-processamento | Integração Dolby.io antes da transcrição |
| Filtragem de conversas paralelas | 🟣 QUAL | `analysis_results` | Módulo IA: "identifique e descarte trechos fora do contexto de venda" |
| Remoção de trechos irrelevantes | 🟣 QUAL | `analysis_results` | Módulo IA: segmentação de relevância |
| Detecção de qualidade do áudio | 🟦 QUANT | `audio_files.audio_quality_score` | Avaliar SNR no upload, salvar score |
| Segmentação em fases | 🟣 QUAL → 🟦 | `analysis_results` | Módulo IA: "Identifique as fases: abordagem/sondagem/apresentação/negociação/fechamento com timestamps" |
| Detecção de idioma | 🟦 QUANT | `transcriptions.language` | Whisper retorna idioma — salvar o campo |

**Relatórios desta seção:**
- 🟦 Qualidade média de áudio por loja
- 🟦 Distribuição de idiomas
- 🔀 Duração por fase (IA → banco → gráfico de barras empilhado)

---

### 3. ANÁLISE SEMÂNTICA E NLP
> **Todo este grupo é 🟣 QUALITATIVO** — cada sub-item é um módulo de análise configurável pelo usuário.

| Sub-item | Módulo sugerido | Campo-chave no JSON output |
|----------|-----------------|---------------------------|
| Extração de entidades (produtos, marcas, preços) | `entity_extractor` | `{products[], brands[], prices[]}` |
| Detecção de objeções | `objection_detector` | `{objections[{type, text, was_overcome}]}` |
| Elogios e reclamações | `sentiment_events` | `{events[{type: "praise/complaint", target, text}]}` |
| Análise de sentimento por trecho | `sentiment_per_phase` | `{phases[{name, sentiment, score}]}` |
| Detecção de emoções | `emotion_detector` | `{emotions[{segment, emotion, confidence}]}` |
| Tópicos emergentes | `topic_extractor` | `{topics[], emerging[]}` |
| Palavras-chave frequentes | `keyword_extractor` | `{keywords[{word, frequency}]}` |
| Menção a concorrentes | `competitor_detector` | `{competitors[{name, context, sentiment}]}` |
| Gatilhos de compra | `purchase_trigger` | `{triggers[{type, text}]}` |
| Detecção de urgência | `urgency_detector` | `{urgency_score: 0-100, signals[]}` |
| Barreiras à compra | `barrier_detector` | `{barriers[{type, was_overcome}]}` |
| Tom de voz (confiança, cansaço) | `tone_analyzer` | `{vendor_tone, client_tone, evolution[]}` |
| Perguntas cliente vs vendedor | `question_analyzer` | `{client_questions[], vendor_questions[]}` |
| Ratio de fala | `speech_ratio` | `{vendor_pct, client_pct}` (requer diarização) |
| Detecção de interrupções | `interruption_detector` | `{interruptions[{by, impact}]}` |

**Relatórios desta seção:**
- 🔀 Ranking de objeções mais frequentes (IA extrai → banco conta)
- 🔀 Nuvem de tags de topics/keywords agregados
- 🔀 Evolução de sentimento por período
- 🔀 Taxa de superação de objeções por vendedor

---

### 4. CONSTRUTOR DE PROMPTS PERSONALIZADOS
> **Todo este grupo é Operacional** — é a própria UI de gerenciamento dos módulos.

| Sub-item | Como é atendido |
|----------|----------------|
| Interface visual de criação | Página `analise.html` — editor de módulo |
| Editor de texto para prompt | Textarea editável em `classification_modules.system_prompt` |
| Variáveis inseríveis | `{{transcricao}}`, `{{nome_audio}}`, `{{loja}}`, `{{vendedor}}`, `{{data}}`, `{{missao}}` |
| Seleção de dados de contexto | Checkboxes no editor: incluir dados do produto, CRM, histórico |
| Formato de saída configurável | Campo `output_schema` define o JSON; alternativas: Texto livre, Tabela |
| Editor de schema JSON | Editor JSON com validação sintática na UI |
| Testador de prompt | Botão "Testar" — executa o módulo em áudio selecionado sem salvar |
| Versionamento | Campo `version` em `classification_modules`, incrementa a cada edição |
| Duplicação | Botão "Clonar" — cria cópia com `name = "Cópia de X"` |
| Import/Export | Export JSON do módulo; Import via upload |
| Templates pré-prontos | `is_template = true` — os 6 módulos base do sistema |
| Marketplace | `is_public = true` — módulos podem ser compartilhados entre usuários |
| Quando executar | Campo `execution_trigger`: 'sempre', 'venda', 'sem_venda', 'manual' |
| Prioridade de execução | Campo `priority` INTEGER — define ordem de execução em batch |
| Agendamento | Job de re-análise agendado (cron) disparado por atualização de prompt |

---

### 5. ANÁLISES PRÉ-CONFIGURADAS — CLIENTE OCULTO

#### 5.1 Checklist Zeiss V.6
> 🟣 QUALITATIVO — Template `classification_modules` com `is_template = true`

O JSON de output do módulo:
```json
{
  "checklist_version": "zeiss_v6",
  "score": <número>,
  "score_maximo": 22,
  "percentual": <número>,
  "itens": [
    { "item": "Cumprimentou o cliente?",          "resultado": true/false, "evidencia": "...", "obrigatorio": true  },
    { "item": "Perguntou se conhece a ZEISS?",     "resultado": true/false, "evidencia": "...", "obrigatorio": true  },
    { "item": "Explicou sobre a ZEISS?",           "resultado": true/false, "evidencia": "...", "obrigatorio": false },
    { "item": "Usou lensômetro?",                  "resultado": true/false, "evidencia": "...", "obrigatorio": true  },
    { "item": "Limpou com lens wipes?",            "resultado": true/false, "evidencia": "...", "obrigatorio": false },
    { "item": "Usou ultrassônico?",                "resultado": true/false, "evidencia": "...", "obrigatorio": false },
    { "item": "Perguntou profissão?",              "resultado": true/false, "evidencia": "...", "obrigatorio": true  },
    { "item": "Perguntou uso de eletrônicos?",     "resultado": true/false, "evidencia": "...", "obrigatorio": false },
    { "item": "Perguntou esportes com óculos?",    "resultado": true/false, "evidencia": "...", "obrigatorio": false },
    { "item": "Perguntou se dirige?",              "resultado": true/false, "evidencia": "...", "obrigatorio": false },
    { "item": "Perguntou sensibilidade à luz?",    "resultado": true/false, "evidencia": "...", "obrigatorio": false },
    { "item": "Comentou iTerminal/Visufit?",       "resultado": true/false, "evidencia": "...", "obrigatorio": true  },
    { "item": "Realizou medição com equipamento?", "resultado": true/false, "evidencia": "...", "obrigatorio": true  },
    { "item": "Ofertou maior valor primeiro?",     "resultado": true/false, "evidencia": "...", "obrigatorio": true  },
    { "item": "Ofertou tecnologias adicionais?",   "resultado": true/false, "evidencia": "...", "obrigatorio": false },
    { "item": "Explicou lentes ZEISS?",            "resultado": true/false, "evidencia": "...", "obrigatorio": false },
    { "item": "Demonstrou interesse genuíno?",     "resultado": true/false, "evidencia": "...", "obrigatorio": false },
    { "item": "Usou recurso visual?",              "resultado": true/false, "evidencia": "...", "obrigatorio": false },
    { "item": "Usou app VisuConsult?",             "resultado": true/false, "evidencia": "...", "obrigatorio": false },
    { "item": "Consultou tabela de preços?",       "resultado": true/false, "evidencia": "...", "obrigatorio": false },
    { "item": "Solicitou contato?",                "resultado": true/false, "evidencia": "...", "obrigatorio": true  },
    { "item": "Follow-up em 7 dias?",             "resultado": true/false, "evidencia": "via_banco", "obrigatorio": false }
  ]
}
```
> Item 22 é **híbrido**: a IA marca `false` por padrão; o sistema depois de 7 dias consulta `followups` e atualiza automaticamente.

**Relatórios:**
- 🔀 Score médio por vendedor / loja / período
- 🔀 Heatmap de itens: quais são mais/menos cumpridos
- 🔀 Evolução do score individual de cada vendedor

#### 5.2 Checklist Genérico Personalizável
O usuário cria um novo módulo via editor com seu próprio checklist no prompt e schema. Totalmente coberto pela arquitetura de `classification_modules`.

---

### 6. MÉTRICAS DE VENDAS
> 🟦 QUANTITATIVO — Queries sobre `audio_files` e `analysis_results`

| Métrica | Query / Fonte |
|---------|--------------|
| ROI por conversa | `sale_amount / (duration_seconds/3600 * vendor.cost_per_hour)` |
| Custo por conversa | `duration_seconds/3600 * vendor.cost_per_hour` |
| Taxa de conversão | `COUNT(outcome='venda') / COUNT(*)` |
| Ticket médio | `AVG(sale_amount)` |
| Ticket médio premium vs. não | JOIN com `analysis_results` do módulo `upsell_detector` |
| Ticket médio por vendedor | `AVG(sale_amount) GROUP BY vendor_id` |
| Ticket médio por loja | `AVG(sale_amount) GROUP BY store_id` |
| Ticket por dia da semana | `AVG(sale_amount) GROUP BY EXTRACT(dow FROM created_at)` |
| Ticket por horário | `AVG(sale_amount) GROUP BY EXTRACT(hour FROM created_at)` |
| Ticket por duração | Scatter: `duration_seconds` vs `sale_amount` |
| Margem por conversa | `sale_amount * (1 - discount_pct/100) - custo_venda` |
| Desconto médio | `AVG(discount_pct)` |
| Eficiência | `sale_amount / (duration_seconds/60)` |
| Tempo médio de conversa | `AVG(duration_seconds)` |
| Tempo por fase | JOIN com `analysis_results` do módulo `phase_segmenter` |
| Comparativo vendedor vs média | Z-score de métricas por `vendor_id` |
| Evolução temporal | Série temporal de qualquer métrica acima |

---

### 7. OPORTUNIDADES DE VENDA
> 🟣 QUALITATIVO (extração IA) → 🔀 HÍBRIDO (agregação banco)

**Módulo `opportunity_analyzer`** — JSON de saída:
```json
{
  "cross_sell_perdido": [
    { "produto_sugerido": "DuraVision BlueProtect", "motivo": "cliente usa computador mas não foi ofertado", "momento_ideal": "após pergunta sobre eletrônicos", "probabilidade_aceitacao": 0.72 }
  ],
  "up_sell_perdido": [
    { "versao_superior": "Zeiss Individual 2", "motivo": "cliente não recebeu opção premium primeiro", "delta_valor_perdido": 450.00 }
  ],
  "oportunidades_genericas": [
    { "tipo": "produto_pedido_nao_ofertado", "descricao": "cliente pediu lente fotossensível mas não foi ofertada" },
    { "tipo": "programa_fidelidade", "descricao": "cliente recorrente — clube de vantagens não mencionado" }
  ],
  "valor_total_oportunidade_estimado": 650.00
}
```

**Relatórios:**
- 🔀 Valor acumulado de oportunidades perdidas por período / loja / vendedor
- 🔀 Produtos mais esquecidos no cross-sell
- 🔀 Ranking de produtos up-sell mais ignorados

---

### 8. PRODUTOS PEDIDOS vs. APRESENTADOS
> 🟣 QUALITATIVO → 🔀 HÍBRIDO

**Módulo `product_coverage_analyzer`** — JSON de saída:
```json
{
  "products_pedidos": ["lente progressiva", "proteção UV"],
  "products_apresentados": ["Zeiss Individual 2", "DuraVision", "Photofusion"],
  "gap": [{ "pedido": "lente progressiva", "status": "apresentado com nome diferente" }],
  "ofertas_proativas": ["Photofusion não pedida, ofertada pelo vendedor"],
  "mencionados_casualmente": [{ "produto": "óculos de sol", "foi_explorado": false }],
  "taxa_cobertura_pct": 85.0
}
```

**Relatórios:**
- 🔀 % de cobertura de pedidos por vendedor
- 🔀 Produtos mais frequentemente pedidos mas não mostrados
- 🔀 Taxa de proatividade (ofertas não solicitadas / total de ofertas)

---

### 9. TENDÊNCIAS DE COMPORTAMENTO
> 🟦 QUANTITATIVO — queries de série temporal sobre `audio_files` + `analysis_results`

| Tendência | Query |
|-----------|-------|
| Horário de maior fluxo | `COUNT(*) GROUP BY EXTRACT(hour FROM created_at)` |
| Dia da semana com maior conversão | `COUNT(outcome='venda')/COUNT(*) GROUP BY dow` |
| Sazonalidade | `COUNT(*) GROUP BY date_trunc('month', ...)` |
| Evolução de objeções | Série temporal de `analysis_results` do módulo `objection_detector` |
| Produtos em alta | Frequência de menção em `entity_extractor` por semana |
| Duração média de conversa por período | `AVG(duration_seconds) GROUP BY semana` |
| Evolução de sentimento | Série temporal de `sentiment_per_phase.sentimento_geral` |
| Padrões de recompra | Join com CRM / histórico de compras externo |

---

### 10. TEMPO DE PERMANÊNCIA NA LOJA
> 🟦 QUANTITATIVO (duração bruta) + 🔀 HÍBRIDO (duração por fase)

| Sub-item | Fonte |
|----------|-------|
| Duração total | `audio_files.duration_seconds` |
| Tempo por fase | Módulo `phase_segmenter` → `{phases[{name, start_sec, end_sec, duration_sec}]}` |
| Correlação duração × conversão | Scatter `duration_seconds` vs `outcome` |
| Conversas longas improdutivas | Filter: `duration > X AND outcome = 'sem_venda'` |
| Conversas curtas com alta conversão | Filter: `duration < Y AND outcome = 'venda'` |
| Tempo até primeira menção de produto | Módulo `phase_segmenter` → `first_product_mention_sec` |
| Tempo até apresentação de preço | Módulo `entity_extractor` → primeiro timestamp de preço |
| Tempo de decisão | Módulo `phase_segmenter` → duração fase `negociacao + fechamento` |

---

### 11. PREFERÊNCIAS POR ESTILOS/ASSUNTOS
> 🟣 QUALITATIVO — Módulo `engagement_analyzer`

JSON de saída:
```json
{
  "temas_de_alto_engajamento": ["tecnologia das lentes", "garantia vitalícia"],
  "temas_de_baixo_engajamento": ["desconto"],
  "estilo_comunicacao_preferido": "técnico",
  "prefere_demonstracoes": "visuais",
  "horario_preferido_contato": "manhã",
  "canal_preferido": "presencial"
}
```

---

### 12. CAPTURA DE OBSERVAÇÕES
> 🟦 QUANTITATIVO (scores) + 🟣 QUALITATIVO (análise de notas)

| Sub-item | Tabela | Campo |
|----------|--------|-------|
| Campo livre do auditor | `audio_files.notes` | Texto livre |
| Fotos da loja | `audit_photos` | `storage_path`, `category` |
| Checklist físico (iluminação, etc.) | `audit_observations` | `category`, `score` |
| Apresentação pessoal do vendedor | `audit_observations` | `category = 'apresentacao_pessoal'` |
| Atmosfera da loja | `audit_observations` | `category = 'atmosfera'` |
| Outros funcionários | `audit_observations` | `category = 'equipe'` |
| Material de merchandising | `audit_observations` | `category = 'merchandising'` |
| Concorrência visível | `audit_observations` | `category = 'concorrencia_local'` |

**Relatórios:**
- 🟦 Score médio de apresentação pessoal por loja
- 🟦 Evolução de scores físicos ao longo do tempo
- 🟣 Módulo IA analisa as notas livres e extrai padrões recorrentes

---

### 13. CRÍTICAS VELADAS
> 🟣 QUALITATIVO — Módulo `implicit_negative_detector`

JSON de saída:
```json
{
  "criticas_veladas": [
    { "tipo": "evasao_educada", "frase": "vou pensar...", "impacto_estimado": "alto" },
    { "tipo": "comparacao_desfavoravel_sutil", "frase": "lá era mais acessível", "impacto": "médio" },
    { "tipo": "mudanca_de_tom", "descricao": "cliente ficou lacônico após ver o preço" }
  ],
  "score_satisfacao_implicita": 58
}
```

---

### 14. ANÁLISE DE INTENÇÃO
> 🟣 QUALITATIVO → 🔀 (score é usado em relatórios quantitativos de conversão)

Módulo `purchase_intent_scorer` — JSON de saída:
```json
{
  "intent_score": 78,
  "classificacao": "propenso_a_comprar",
  "sinais_positivos": ["perguntou prazo de entrega", "pediu opção em outra cor"],
  "sinais_negativos": ["mencionou que vai pesquisar online"],
  "momento_maior_receptividade": "após demonstração do equipamento",
  "recomendacao_followup": { "timing_dias": 2, "canal": "whatsapp", "abordagem": "oferta personalizada" }
}
```

**Relatórios:**
- 🔀 Correlação entre `intent_score` e `outcome` real (validação do modelo)
- 🔀 Distribuição de scores por vendedor

---

### 15. PERCEPÇÃO DE PERFIL PSICOLÓGICO
> 🟣 QUALITATIVO — Módulo `psychological_profiler`

```json
{
  "arquetipo": "racional",
  "estilo_decisao": "analítico",
  "sensibilidade": "qualidade_sobre_preco",
  "velocidade_decisao": "lenta",
  "grau_autonomia": "decide_sozinho",
  "nivel_conhecimento_produto": "baixo",
  "confianca_em_vendedor": "cético",
  "necessidade_validacao_social": "baixa"
}
```

---

### 16. ANÁLISE DE PERFIL DE CLIENTE
> 🔀 HÍBRIDO — parte inferida pela IA, parte do banco.

| Sub-item | Fonte |
|----------|-------|
| Segmentação demográfica | 🟣 Módulo `client_profiler` inferência por linguagem |
| Profissão | 🟣 `entity_extractor` campo `profissao` |
| Frequência de compra | 🟦 Histórico em CRM / tabela `followups` |
| Poder aquisitivo estimado | 🟣 Módulo `client_profiler` |
| Lifetime Value estimado | 🟦 Soma de `sale_amount` histórico por cliente (CRM) |
| Canal de aquisição | 🟦 `audio_files` campo `acquisition_channel` |
| Sensibilidade a promoções | 🟣 Módulo `behavioral_analyzer` |

---

### 17. COMPARAÇÃO E BENCHMARKING
> 🟦 QUANTITATIVO — queries de ranking e agregação

```sql
-- Exemplo: ranking de vendedores por score de checklist e conversão
SELECT
    v.name AS vendedor,
    s.name AS loja,
    AVG((ar.result_json->>'percentual')::numeric) AS score_medio_checklist,
    COUNT(CASE WHEN af.outcome = 'venda' THEN 1 END)::float / COUNT(*) AS taxa_conversao,
    AVG(af.sale_amount) AS ticket_medio
FROM audio_files af
JOIN vendors v ON v.id = af.vendor_id
JOIN stores s ON s.id = af.store_id
LEFT JOIN analysis_results ar ON ar.audio_id = af.id AND ar.module_id = '<zeiss_v6_module_id>'
GROUP BY v.id, v.name, s.name
ORDER BY taxa_conversao DESC;
```

**Relatórios:**
- 🟦 Ranking de vendedores (score, conversão, ticket)
- 🟦 Ranking de lojas
- 🟦 Comparativo regional
- 🟦 Identificação de outliers (Z-score > 2σ)
- 🟦 Identificação de melhores práticas (top 10% vs. bottom 10%)

---

### 18. BIBLIOTECA DE MELHORES PRÁTICAS
> 🔀 HÍBRIDO

| Sub-item | Abordagem |
|----------|-----------|
| Repositório de conversas exemplares | `practice_library` — auditados marcam áudios com score ≥ limiar |
| Busca por situação | Full-text search em `transcriptions.text` + tags em `practice_library` |
| Áudios de referência por habilidade | Filtro por `tags` na `practice_library` |
| Melhores argumentos que mais convertem | 🟣 Módulo `best_argument_detector` correlacionado com `outcome = 'venda'` |
| Respostas eficazes para objeções | 🔀 `objection_detector.objecoes.resposta_vendedor` WHERE `foi_superada = true` |
| Scripts que funcionam vs. não | 🔀 Clusterizar comportamentos por `outcome` |

---

### 19. DETECÇÃO DE OBJEÇÕES E RESPOSTAS
> 🟣 QUALITATIVO → 🔀

**Módulo `objection_response_analyzer`** já detalhado na seção 3.
**Relatórios adicionais:**
- 🔀 Taxa de sucesso por TIPO de resposta (reformulação / contorno / concessão)
- 🔀 Quais respostas de objeção convertem mais, por tipo de produto
- 🔀 Momento da conversa onde cada tipo de objeção surge (fase × tipo)

---

### 20. ANÁLISE DE CONFORMIDADE (COMPLIANCE)
> 🟣 QUALITATIVO → Alertas 🟦

**Módulo `compliance_checker`** — JSON de saída:
```json
{
  "score_compliance": 82,
  "violacoes": [
    { "tipo": "promessa_sem_respaldo", "frase": "garanto entrega em 3 dias", "severidade": "media" }
  ],
  "mencoes_obrigatorias_ausentes": ["garantia legal de 90 dias", "direito de arrependimento"],
  "seguiu_script_obrigatorio": true
}
```

- 🟦 Relatório de conformidade por loja / vendedor
- Alertas automáticos via `alert_rules` quando `score_compliance < limiar`

---

### 21. TREINAMENTO E DESENVOLVIMENTO
> 🟣 + 🟦 + Operacional

| Sub-item | Abordagem |
|----------|-----------|
| Gaps por vendedor | 🔀 Quais itens do checklist têm menor % de cumprimento por `vendor_id` |
| Trilhas de aprendizado personalizadas | 🟣 Módulo IA: "dado esses gaps, sugira plano de ação" |
| Áudios de referência por gap | 🟦 Busca em `practice_library` por tags relacionadas ao gap |
| Planos de ação individualizados | 🟣 Output do módulo de plano salvo em nova tabela `training_plans` |
| Acompanhamento de evolução | 🟦 Série temporal do score do checklist por `vendor_id` |
| Gamificação | 🟦 `vendor_badges` — conquistas baseadas em métricas do banco |
| Simulador de conversas | 🟣 Chat com IA onde IA atua como cliente (persona configurável) |
| Quiz automático | 🟣 Módulo IA gera perguntas baseadas em boas práticas |
| Certificações | 🟦 `vendor_certifications` — emitidas quando critérios do banco são atingidos |

---

### 22. DASHBOARDS E VISUALIZAÇÕES
> Operacional — Frontend dinâmico

| Dashboard | Métricas |
|-----------|----------|
| Executivo | ROI, conversão geral, ranking de lojas, tendências |
| Gerencial | Lojas sob sua gestão, alertas, top performers |
| Operacional | Vendedores da loja, checklist, oportunidades |
| Individual | Score próprio, gaps, evolução, histórico |
| Construtor personalizado | Campos de `report_fields` dos módulos escolhidos pelo usuário |

**Gráficos disponíveis:** linha, barra, pizza, scatter, heatmap, funil, gauge, nuvem de tags  
**Filtros dinâmicos:** período, loja, vendedor, produto, módulo de análise, outcome  
**Export:** PNG, PDF, CSV por gráfico  
**Alertas:** via `alert_rules` — notifica quando métrica cruza threshold  
**Agendamento:** relatório enviado por email semanalmente (Supabase Edge Function + Resend)

---

### 23. INTEGRAÇÕES COM SISTEMAS EXTERNOS

| Integração | Abordagem |
|------------|-----------|
| CRM (HubSpot, Salesforce, RD Station) | Webhook bidirecional: sync cliente, venda, follow-up |
| ERP (TOTVS, SAP) | Export CSV agendado + API REST |
| PDV / Sistema de vendas | Confirma `outcome` e `sale_amount` automaticamente via webhook |
| WhatsApp Business | Meta Cloud API — envio de relatórios e alertas |
| E-commerce | Correlacionar visita offline com compra online |
| Estoque | Validar `products_pedidos vs. disponíveis` |
| Preços / Promoções | Alimentar módulo IA com promoções vigentes como contexto |
| Webhooks configuráveis | Tabela `webhook_endpoints` + disparo por evento |
| API REST externa | OpenAPI documentada + autenticação por API Key |
| Export CSV/Excel | Download de qualquer query de relatório |

---

### 24. GESTÃO DE CATÁLOGO DE PRODUTOS

| Sub-item | Tabela / Campo |
|----------|---------------|
| Cadastro de produtos | `product_catalog` |
| Categorização | `product_catalog.category` |
| Produtos complementares | `product_catalog.complementary_ids[]` |
| Versões (básico/premium) | `product_catalog.upsell_ids[]` |
| Margem | `product_catalog.margin_pct` |
| Palavras-chave | `product_catalog.keywords[]` — alimenta `cross_sell_detector` |
| Scripts/argumentos | `product_catalog.arguments JSONB` |
| Performance por produto | 🔀 JOIN `entity_extractor results` com `product_catalog` + `outcome` |

---

### 25. GESTÃO DE LOJAS E TERRITÓRIOS

Tabelas: `regions`, `stores`, `vendors`  
**Metas:** tabela `goals` com `{entity_type, entity_id, metric, target, period}`  
**Interface:** `configuracoes/lojas.html` — CRUD com hierarquia  
**Relatórios:** 🟦 Performance por loja vs. meta, mapas de calor regionais

---

### 26. GESTÃO DE USUÁRIOS E PERMISSÕES

**Perfis:** Admin > Gerente Regional > Gerente de Loja > Vendedor > Auditor  
**Controle via:** Supabase RLS + tabela `user_roles`  
**Permissões granulares:**
```sql
CREATE TABLE user_roles (
    id UUID PK, user_id UUID, role TEXT,
    store_id UUID,    -- null = acesso a todas as lojas
    region_id UUID,   -- null = acesso a todas as regiões
    can_view_other_vendors BOOL DEFAULT false,
    can_delete_audio BOOL DEFAULT false,
    can_edit_modules BOOL DEFAULT false,
    can_export_data BOOL DEFAULT true
);
```
**Logs de auditoria:** `audit_log` com `user_id, action, resource_id, timestamp`  
**MFA:** Habilitado via Supabase Auth

---

### 27. PLAYER DE ÁUDIO SINCRONIZADO
> Operacional — Frontend

- Waveform: Wavesurfer.js
- Clique na transcrição → pula para timestamp correspondente
- Highlights de fases (cores por fase identificada pelo módulo `phase_segmenter`)
- Bookmarks: `audio_bookmarks` — salva e recupera marcações
- Velocidade: 0.5x / 1x / 1.5x / 2x
- Compartilhamento: link com token e timestamp específico

---

### 28. TRANSCRIÇÃO INTERATIVA
> Operacional — Frontend

- Visualização: `transcriptions.text` renderizado com `speaker_id` colorido
- Destaque de entidades: `entity_extractor` result → highlight por tipo
- Busca: full-text search (`LIKE` ou GIN index no Supabase)
- Anotações: `transcript_annotations` — clique no trecho → abre editor de nota
- Edição manual: `contenteditable` com save em `transcriptions.text`

---

### 29. EXPORTAÇÃO E COMPARTILHAMENTO

| Sub-item | Tecnologia |
|----------|-----------|
| PDF de análise | jsPDF ou endpoint server-side com template HTML → Puppeteer |
| CSV/Excel de dados brutos | Download de query result |
| Link compartilhável | Token temporário em `shared_links` com expiração |
| Email de relatório | Supabase Edge Function + Resend/SendGrid |
| PowerPoint automático | pptxgenjs com os gráficos do dashboard |

---

### 30. ALERTAS E NOTIFICAÇÕES

**Tabelas:** `alert_rules` + `alert_events`  
**Tipos de alerta:**
- Score de checklist abaixo do limiar
- Oportunidade perdida acima de R$X
- Meta não atingida no período
- Padrão anormal detectado (Z-score > 2σ)
- Análise concluída (notificação para o usuário)

**Disparo:** Supabase Edge Function chamada após inserção em `analysis_results`  
**Canais:** push no browser (Realtime), email (Resend), webhook externo

---

### 31. ANÁLISE COMPETITIVA
> 🟣 QUALITATIVO — Módulo `competitor_analyzer`

```json
{
  "concorrentes_mencionados": [
    { "nome": "GrandVision", "frequencia": 3, "contexto": "comparação de preço", "sentimento_cliente": "favorável ao concorrente" }
  ],
  "argumentos_cliente_favor_concorrente": ["entrega mais rápida", "preço menor"],
  "respostas_vendedor": ["explicou garantia ZEISS", "mencionou exclusividade"],
  "resultado": "manteve cliente na loja"
}
```

**Relatórios:** 🔀 Frequência de menção por concorrente, taxa de perda por concorrente

---

### 32. ANÁLISE DE LINGUAGEM E COMUNICAÇÃO
> 🟣 QUALITATIVO — Módulo `communication_style_analyzer`

```json
{
  "complexidade_linguagem": "acessível",
  "uso_jargao_tecnico": "moderado",
  "perguntas_abertas_vs_fechadas": { "abertas": 7, "fechadas": 3 },
  "tecnicas_identificadas": ["SPIN selling: sondagem", "ancoragem de preço"],
  "empatia_score": 72,
  "escuta_ativa_detectada": true,
  "reformulacoes": ["vendedor repete 'então o senhor precisa de...' 2 vezes"]
}
```

---

### 33. DETECÇÃO DE MOMENTOS CRÍTICOS
> 🟣 QUALITATIVO — Módulo `critical_moment_detector`

```json
{
  "momentos": [
    { "tipo": "virada_positiva", "descricao": "cliente cético vira interessado após demo", "timestamp_sec": 245 },
    { "tipo": "ponto_de_perda", "descricao": "cliente demonstra intenção de sair", "timestamp_sec": 612 },
    { "tipo": "maior_engajamento", "timestamp_sec": 310 },
    { "tipo": "gate_de_decisao", "descricao": "momento de escolha entre dois produtos", "timestamp_sec": 450 }
  ]
}
```

---

### 34. ANÁLISE DE FOLLOW-UP
> 🟦 QUANTITATIVO (dados em `followups`) + 🟣 QUALITATIVO (análise da conversa de retorno)

| Sub-item | Abordagem |
|----------|-----------|
| Registro de follow-ups | Tabela `followups` |
| Análise da conversa de retorno | Novo áudio de follow-up → mesmo pipeline de classificação |
| Taxa de conversão em follow-up | `COUNT(outcome='venda' WHERE followup_done=true) / COUNT(followup_done=true)` |
| Tempo ideal para follow-up | Correlação `days_between_visit_and_followup` × `outcome` |
| Eficácia por canal | `COUNT(outcome='venda') GROUP BY channel` |

---

### 35. SIMULADOR DE CONVERSAS COM IA
> 🟣 QUALITATIVO — Backend de geração

- Endpoint `/simulate` com sistema de persona de cliente configurável
- Persona definida como módulo IA especial: `{age, profile, objections, knowledge_level}`
- Feedback após simulação: módulo `simulation_evaluator` avalia performance do vendedor
- Progressão de dificuldade: personas pré-configuradas com graus crescentes de resistência
- Resultados de simulação: tabela `simulation_sessions` similar à `chat_sessions`

---

### 36. MARKETPLACE DE ANÁLISES
> Operacional — Multi-tenancy

- `classification_modules.is_public = true` → visível para outros usuários
- Rating: tabela `module_ratings` — `{module_id, user_id, stars, comment}`
- Import: "Usar como base" — clone do módulo público para o usuário
- Feed de módulos populares: ORDER BY `rating DESC`, `executions DESC`

---

### 37. CONFIGURAÇÕES DE MODELO DE IA
> 🟦 QUANTITATIVO (custo rastreado) + Operacional

- Seletor de provedor e modelo já existe em `user_settings`
- Adicionar: `temperature`, `max_tokens`, `fallback_model` em `user_settings`
- Monitoramento de custo: `usage_telemetry` + `analysis_results.cost_usd` — totais por período
- Fallback automático: lógica do servidor tenta modelo alternativo em erro 429/500

---

### 38. COMPLIANCE E PRIVACIDADE (LGPD)

| Sub-item | Abordagem |
|----------|-----------|
| Anonimização de dados pessoais | Módulo IA: substitui CPF, telefone, nome por `[ANONIMIZADO]` antes de salvar |
| Política de retenção | Job de limpeza: delete `audio_files` WHERE `created_at < NOW() - INTERVAL X days` |
| Gestão de consentimento | Tabela `consent_log` + tela de aceite antes do upload |
| Logs de acesso a dados sensíveis | `audit_log` com `action`, `resource_id`, `user_id` |
| Exportação de dados (Titular) | Endpoint que retorna todos os dados relacionados a um `user_id` |
| Termo de consentimento | Configurável em `user_settings.consent_template_text` |

---

### 39. ANÁLISE PREDITIVA
> 🟣 QUALITATIVO (modelos de ML)

**Nota:** Requer volume histórico (mínimo 3-6 meses de dados) para treino.

| Previsão | Abordagem |
|----------|-----------|
| Probabilidade de conversão | Modelo de classificação (Random Forest / Logistic Regression) treinado sobre features extraídas da IA + `outcome` histórico |
| Ticket médio estimado | Regressão linear sobre perfil de cliente + histórico |
| Risco de churn | Padrão de redução de frequência de visita no CRM |
| Melhor horário de follow-up | Análise de taxa de conversão por `EXTRACT(hour FROM followup_date)` |
| Produto com maior chance de venda | Modelo colaborativo: clientes similares (psych_profiler) + histórico de aceite |

**Pipeline:** features extraídas de `analysis_results` → modelo treinado (Python/scikit-learn) → score salvo em `audio_files.predicted_conversion_score`

---

### 40. HEATMAP DE CONVERSA
> 🟣 QUALITATIVO → Visualização Frontend

- **Dados:** `sentiment_per_phase` + `critical_moment_detector` + `phase_segmenter`
- **Renderização:** D3.js — eixo X = tempo (segundos), eixo Y = intensidade emocional
- **Cores:** vermelho (negativo), verde (positivo), cinza (neutro)
- **Sobreposição:** marcadores de fase, objeções, momentos críticos, bookmarks
- **Interatividade:** clique em ponto do heatmap → player pula para aquele instante

```json
// Dados de entrada do heatmap (saída combinada dos módulos):
{
  "timeline": [
    { "second": 0,   "sentiment_score": 0.5, "phase": "abordagem",   "event": null },
    { "second": 30,  "sentiment_score": 0.7, "phase": "sondagem",    "event": null },
    { "second": 145, "sentiment_score": 0.3, "phase": "negociacao",  "event": "objecao_preco" },
    { "second": 200, "sentiment_score": 0.8, "phase": "negociacao",  "event": "virada_positiva" },
    { "second": 310, "sentiment_score": 0.9, "phase": "fechamento",  "event": "decisao_compra" }
  ]
}
```

---

## SUMÁRIO EXECUTIVO: COBERTURA COMPLETA

| Grupo | Tipo | Mecanismo Central |
|-------|------|------------------|
| 1. Captura | Operacional + QUANT | `audio_files`, `missions`, `recording_devices` |
| 2. Processamento | QUANT + QUAL | Pipeline pré-processamento + módulos IA |
| 3. NLP / Semântica | QUAL | 15 módulos configuráveis |
| 4. Construtor de Prompts | Operacional | Página gerenciadora de `classification_modules` |
| 5. Checklists | QUAL → QUANT | Templates de módulos (editáveis) + relatório de score |
| 6. Métricas de Vendas | QUANT | Queries em `audio_files` com campos de outcome/venda |
| 7. Oportunidades | HÍBRIDO | Módulo `opportunity_analyzer` + agregação banco |
| 8. Produtos Pedidos vs. Apresentados | HÍBRIDO | Módulo `product_coverage_analyzer` |
| 9. Tendências | QUANT | Séries temporais em banco |
| 10. Tempo de Permanência | QUANT + HÍBRIDO | `duration_seconds` + módulo `phase_segmenter` |
| 11. Preferências de Estilo | QUAL | Módulo `engagement_analyzer` |
| 12. Observações | QUANT + QUAL | `audit_observations`, `audit_photos` + módulo de notas |
| 13. Críticas Veladas | QUAL | Módulo `implicit_negative_detector` |
| 14. Intenção de Compra | QUAL → QUANT | Módulo `purchase_intent_scorer` + correlação histórica |
| 15. Perfil Psicológico | QUAL | Módulo `psychological_profiler` |
| 16. Perfil de Cliente | HÍBRIDO | Módulo `client_profiler` + histórico banco + CRM |
| 17. Benchmarking | QUANT | Queries de ranking com Z-score |
| 18. Biblioteca de Práticas | HÍBRIDO | `practice_library` + busca em `transcriptions` |
| 19. Objeções e Respostas | QUAL → QUANT | Módulo `objection_response_analyzer` |
| 20. Conformidade | QUAL + Alertas | Módulo `compliance_checker` + `alert_rules` |
| 21. Treinamento | HÍBRIDO | Gaps do banco + módulo de plano de ação + simulador |
| 22. Dashboards | Operacional | Engine de visualização dinâmica via `report_fields` |
| 23. Integrações Externas | Operacional | Webhooks, APIs REST, Export CSV |
| 24. Catálogo de Produtos | QUANT | `product_catalog` com CRUD |
| 25. Lojas e Territórios | QUANT | `regions`, `stores`, `vendors` com hierarquia |
| 26. Usuários e Permissões | Operacional | Supabase Auth + RLS + `user_roles` |
| 27. Player Sincronizado | Operacional | Wavesurfer.js + sync com `transcript_annotations` |
| 28. Transcrição Interativa | Operacional | Full-text search + highlights + `transcript_annotations` |
| 29. Exportação | Operacional | jsPDF, CSV, pptxgenjs, Resend |
| 30. Alertas e Notificações | Operacional | `alert_rules` + Edge Functions + Realtime |
| 31. Análise Competitiva | QUAL → QUANT | Módulo `competitor_analyzer` + tendências banco |
| 32. Linguagem e Comunicação | QUAL | Módulo `communication_style_analyzer` |
| 33. Momentos Críticos | QUAL | Módulo `critical_moment_detector` |
| 34. Follow-up | QUANT + QUAL | Tabela `followups` + módulo análise de retorno |
| 35. Simulador de Conversas | QUAL | Endpoint `/simulate` + `simulation_sessions` |
| 36. Marketplace | Operacional | `is_public`, ratings, clone de módulos |
| 37. Config de Modelo IA | QUANT + Operacional | `user_settings` + `usage_telemetry` |
| 38. LGPD / Privacidade | Operacional | Anonimização + `consent_log` + `audit_log` |
| 39. Análise Preditiva | QUAL (ML) | Modelo treinado sobre histórico de `analysis_results` |
| 40. Heatmap | QUAL → Visual | Combinação `sentiment` + `phases` + D3.js |

**Total: 40/40 grupos cobertos.**

---

---

## ESTRATÉGIA DE VERSÃO 2 (V2)

> **Premissa:** Tudo que funciona na V1 não pode se perder. O desenvolvimento das novas funcionalidades acontece em uma cópia isolada do projeto, enquanto a V1 continua operacional para o usuário.

---

### QUANDO CRIAR A V2

A V2 é criada **após a V1 estar estável nos seguintes critérios:**

```
CHECKLIST DE SAÍDA DA V1 (pré-requisito para abrir a V2)

✅ Upload de áudio funcionando sem erros
✅ Transcrição (Whisper / Gemini) funcionando em 100% dos uploads
✅ Classificação via prompt livre salvando resultado em audio_classifications
✅ Chat com IA sobre transcrição funcionando e logando em chat_messages
✅ Logs de chat exibindo histórico corretamente
✅ Relatório de custos (usage_telemetry) funcionando
✅ Autenticação e RLS sem falhas conhecidas
✅ Deploy no Netlify estável (sem build errors)
```

Quando todos esses itens estiverem validados em produção, abre-se a V2.

---

### ESTRUTURA DE DIRETÓRIOS

```
C:\Users\User\.gemini\antigravity\scratch\
│
├── AI-Audio-Analyst\          ← V1 — NÃO TOCAR após V2 aberta
│   ├── public\
│   ├── bun_server.js
│   └── ...
│
└── AI-Audio-Analyst-v2\       ← V2 — cópia completa da V1 no dia do fork
    ├── public\
    ├── bun_server.js
    └── ...
```

**Como criar o fork:**
```powershell
# Executar uma única vez, no dia de abertura da V2
Copy-Item -Path "AI-Audio-Analyst" -Destination "AI-Audio-Analyst-v2" -Recurse
```

A partir daí, **V1 congela** — só recebe correções de bugs críticos. Todo desenvolvimento novo vai para V2.

---

### ESTRATÉGIA DE BANCO DE DADOS

O banco Supabase **é o mesmo** para V1 e V2. Isso é intencional:
- Os dados já coletados na V1 (áudios, transcrições, classificações) seguem disponíveis na V2
- Não há migração de dados — a V2 começa com os dados reais da V1
- As novas tabelas da V2 usam o prefixo `v2_` inicialmente, para não conflitar

```
TABELAS V1 (existentes, não modificadas):
  audio_files
  transcriptions
  audio_classifications   ← dados já coletados acessíveis na V2
  usage_telemetry
  user_settings
  chat_sessions
  chat_messages

NOVAS TABELAS DA V2 (adicionadas aditivamente, nunca destrutivas):
  classification_modules  ← engine configurável de análise
  analysis_results        ← resultados JSONB dos módulos
  stores
  vendors
  missions
  product_catalog
  audit_observations
  audit_photos
  followups
  transcript_annotations
  audio_bookmarks
  alert_rules
  alert_events
  practice_library
  user_roles
  consent_log
```

> **Regra de ouro:** Scripts SQL da V2 usam apenas `CREATE TABLE IF NOT EXISTS` e `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`. Nunca `DROP`, nunca `TRUNCATE`, nunca `ALTER COLUMN` com mudança de tipo.

---

### MIGRAÇÃO DOS DADOS EXISTENTES

Os dados de `audio_classifications` (prompt livre da V1) **não são apagados**. São mantidos como legado. A V2 adiciona uma tarefa de migração opcional:

```sql
-- (Opcional) Migrar classificações existentes da V1 para o novo formato V2
-- Executar APENAS se o usuário quiser ver os dados antigos nos novos relatórios
INSERT INTO analysis_results (audio_id, user_id, module_id, module_name, module_version, result_json, created_at)
SELECT
    ac.audio_id,
    ac.user_id,
    NULL as module_id,           -- sem módulo formal — classificação legada
    'Classificação V1 (Legado)' as module_name,
    0 as module_version,
    ac.result_json::jsonb,
    ac.created_at
FROM audio_classifications ac
WHERE ac.result_json IS NOT NULL
  AND ac.result_json != '';
```

---

### RODAR V1 E V2 EM PARALELO

Durante o desenvolvimento da V2, ambas as versões podem rodar localmente ao mesmo tempo em portas diferentes:

| Versão | Porta | URL Local | Netlify |
|--------|-------|-----------|---------|
| V1 | 3000 | http://localhost:3000 | site-v1.netlify.app |
| V2 | 3001 | http://localhost:3001 | site-v2.netlify.app (preview) |

```powershell
# Terminal 1 — V1 (não mexer)
cd AI-Audio-Analyst
bun run bun_server.js

# Terminal 2 — V2 (desenvolvimento ativo)
cd AI-Audio-Analyst-v2
# Ajustar porta no bun_server.js para 3001
bun run bun_server.js
```

No Netlify: Criar um **segundo site** apontando para o repositório da V2 (branch `v2` ou repositório separado).

---

### O QUE MUDA POR VERSÃO

#### V1 — Estado Atual (Congelar)
```
✅ Upload de áudio
✅ Transcrição
✅ Classificação via prompt livre (1 prompt, 1 JSON)
✅ Chat com IA sobre transcrição
✅ Logs de chat
✅ Relatório de custos básico
✅ Autenticação
```

#### V2 — Sprint 1: Infraestrutura
```
□ Criar tabelas novas no Supabase (classification_modules, analysis_results, stores, vendors, missions)
□ Adicionar campos em audio_files (outcome, sale_amount, duration_seconds, vendor_id, mission_id)
□ Criar funções PostgreSQL de agregação dinâmica (JSONB)
□ Inserir templates de módulos pré-configurados no banco
```

#### V2 — Sprint 2: Engine de Classificação Configurável
```
□ Página analise.html — gerenciador de módulos
□ Editor de módulo: prompt + schema + campos de relatório
□ Botão "Testar" (executa sem salvar)
□ Clone de templates
□ Substituir modal "Classificar" no dashboard por seletor de módulos
□ Endpoint /classify_module no servidor
□ Exibição de resultados por módulo em abas
```

#### V2 — Sprint 3: Módulos Prioritários
```
□ Template: Checklist Zeiss V.6 (22 itens com evidência)
□ Template: Avaliação Geral (score, sentimento, venda/não venda)
□ Template: Objeções e Respostas
□ Template: Oportunidades Perdidas
□ Template: Perfil e Intenção do Cliente
□ Template: Segmentação de Fases
```

#### V2 — Sprint 4: Relatórios
```
□ Relatório quantitativo: métricas de vendas (conversão, ticket, custo)
□ Relatório qualitativo: checklist Zeiss visual (✅/❌ por item)
□ Relatório híbrido: oportunidades perdidas + valor estimado
□ Filtros por período, loja, vendedor
□ Export CSV e PDF
```

#### V2 — Sprint 5: Gestão Operacional
```
□ Missões (campanhas de cliente oculto)
□ Cadastro de lojas, regiões, vendedores
□ Catálogo de produtos
□ Gestão de usuários e permissões por perfil
□ Alertas configuráveis
```

#### V2 — Sprint 6: Funcionalidades Avançadas
```
□ Player de áudio sincronizado com transcrição (Wavesurfer.js)
□ Transcrição interativa (busca, destaques, anotações)
□ Diarização de falantes (AssemblyAI)
□ Simulador de conversas com IA
□ Gamificação e treinamento
□ Heatmap de conversa (D3.js)
```

#### V2 → V3 — Futuro
```
□ App mobile para gravação (PWA / React Native)
□ Integrações externas (CRM, ERP, WhatsApp)
□ Análise preditiva com ML
□ Marketplace de módulos
□ LGPD completo (anonimização, retenção, consentimento)
```

---

### VERSIONAMENTO DO CÓDIGO

**Recomendação:** Usar Git para controlar a evolução entre V1 e V2.

```bash
# Estado atual (V1)
git init
git add .
git commit -m "v1.0.0 - baseline estável antes da V2"
git tag v1.0.0

# Abertura da V2 (em branch separado)
git checkout -b v2
# ... desenvolvimento da V2 ...
git commit -m "v2.0.0-alpha - engine de classificação configurável"
```

Vantagem: se algo quebrar na V2, `git checkout v1` retorna imediatamente ao estado funcional.

---

### GARANTIA DE NÃO-REGRESSÃO

Antes de qualquer deploy da V2 para produção, verificar:

```
CHECKLIST DE VALIDAÇÃO PRÉ-DEPLOY V2

□ Upload de áudio ainda funciona?
□ Transcrição ainda funciona?
□ Chat com IA ainda funciona?
□ Logs de chat carregam corretamente?
□ Relatório de custos ainda exibe dados?
□ Classificação básica (modal antigo) ainda funciona?
□ Login / logout sem erros?
□ Dados existentes da V1 visíveis na V2?
□ Nenhuma tabela existente foi alterada de forma destrutiva?
```

Somente após todos os itens marcados, a V2 vai para produção como versão principal.
