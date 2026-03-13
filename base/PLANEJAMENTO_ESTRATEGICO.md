# PLANEJAMENTO ESTRATÉGICO — AI AUDIO ANALYST
## Análise Completa das 40 Funcionalidades e Estrutura de Relatórios

**Data:** Março 2026  
**Objetivo:** Reorganizar o sistema de classificação e relatórios para suportar as 40 categorias de funcionalidades, separando dados **Quantitativos** (extraídos diretamente do banco) dos **Qualitativos** (fluxos de análise via IA).

---

## PRINCÍPIOS FUNDAMENTAIS

### A. Classificação de Dados

| Tipo | Definição | Fonte | Exemplo |
|------|-----------|-------|---------|
| **Quantitativo** | Dados numéricos, contáveis, mensuráveis | Banco de dados (Supabase) | Duração de conversa, número de áudios, contagem de objeções |
| **Qualitativo** | Análise de conteúdo, sentimento, semântica | IA (análise de transcrição) | Classificação de sentimento, tipo de objeção, perfil psicológico |
| **Híbrido** | Necessita extração via IA e depois agrega numericamente | IA → Banco | Score de intenção, checklist preenchido por IA |

### B. Fluxo de Processamento Atual vs. Necessário

```
ATUAL:
Áudio → Transcrição → Prompt estático de classificação → JSON salvo

NECESSÁRIO:
Áudio → Transcrição → Pipeline de múltiplas análises especializadas
         ↓                        ↓
    [Banco: metadados]    [IA: análises paralelas]
         ↓                        ↓
    Dados Quant.         [Banco: resultados estruturados]
         ↓                        ↓
                 → Relatórios Quantitativos + Qualitativos combinados
```

### C. Revisão do Método de Classificação Atual

O método atual de classificação usa **um único prompt genérico** aplicado à transcrição inteira. Isso cria limitações sérias:

1. **Cobertura insuficiente:** Um prompt não cobre todos os 40 grupos.
2. **Sem especialização:** A IA não foca em aspectos específicos (sentimento, objeções, checklist).
3. **Sem estrutura de output:** O JSON resultante não alimenta múltiplas dimensões de relatório.
4. **Sem versionamento:** Não há controle sobre qual prompt gerou qual análise.

**Proposta:** Substituir o prompt único por um sistema de "**Analisadores Modulares**", onde cada análise é um job independente com schema de saída definido.

---

## ESTRUTURA DE BANCO DE DADOS PROPOSTA

Para suportar as 40 funcionalidades, o banco precisa ser expandido com as seguintes tabelas:

### Tabelas Centrais
```sql
audio_files          -- já existe
transcriptions       -- já existe
chat_sessions        -- já existe
chat_messages        -- já existe
usage_telemetry      -- já existe
user_settings        -- já existe
audio_classifications -- já existe (revisar schema)
```

### Novas Tabelas Necessárias
```sql
-- Missões / Campanhas de Cliente Oculto
missions (id, title, store_id, type, checklist_id, start_date, end_date, status)

-- Lojas e Hierarquia
stores (id, name, region, city, manager_user_id)

-- Vendedores
vendors (id, user_id, store_id, name, hire_date)

-- Checklist Templates
checklist_templates (id, name, version, items_json)

-- Resultados de Análise Modular
analysis_jobs (id, audio_id, analyzer_type, status, prompt_version, output_json, cost_usd, created_at)

-- Objeções Detectadas
detected_objections (id, audio_id, analysis_job_id, type, timestamp_sec, vendor_response, success)

-- Oportunidades Perdidas
missed_opportunities (id, audio_id, type, product_id, value_estimate, context)

-- Produtos Mencionados
products_mentioned (id, audio_id, product_name, mentioned_by, context, was_offered)

-- Follow-ups
followups (id, audio_id, vendor_id, scheduled_at, completed_at, outcome)

-- Prompts Customizados (Construtor)
custom_prompts (id, user_id, name, prompt_text, output_schema_json, version, created_at)
```

---

## ANÁLISE DETALHADA POR FUNCIONALIDADE

---

### 1. CAPTURA E GESTÃO DE ÁUDIO

| Sub-item | Tipo | Status | Abordagem |
|----------|------|--------|-----------|
| Gravação de áudio de conversas | **Quant + Operacional** | ⚠️ Parcial | Upload manual já funciona. Gravação nativa exige app mobile (fora do escopo web atual). |
| Upload manual de arquivos | **Quant + Operacional** | ✅ Implementado | `upload.html` funcional. |
| Ativação/desativação via app mobile | **Operacional** | ❌ Não iniciado | Requer app mobile nativo ou PWA com API de microfone. |
| Sincronização automática com nuvem | **Operacional** | ✅ Parcial | Upload vai direto ao Supabase Storage. |
| Criação de missões (campanhas) | **Quant** | ❌ Não iniciado | Nova tabela `missions`. Interface de criação de campanha. |
| Associação de metadata (loja, vendedor, data) | **Quant** | ⚠️ Parcial | Audio tem `store_id`. Falta `vendor_id`, tipo de missão. |
| QR Code para iniciar gravação | **Operacional** | ❌ Não iniciado | Gerar QR com deep link para upload/gravação associado à missão. |
| Marcação de pausas/interrupções | **Quant** | ❌ Não iniciado | Requer app de gravação com UI de timestamp. |
| Anotações manuais durante gravação | **Qual** | ❌ Não iniciado | Campo de texto armazenado em tabela `manual_notes` associado ao `audio_id`. |
| Gestão de dispositivos de gravação | **Operacional** | ❌ Não iniciado | Painel de gestão de dispositivos (bateria, espaço). Escopo de IoT. |

**Prioridade de implementação:** `missões` → `metadata completo (vendor, store)` → `QR Code` → `anotações`
**Dependências:** Tabelas `missions`, `stores`, `vendors`

---

### 2. PROCESSAMENTO DE ÁUDIO

| Sub-item | Tipo | Status | Abordagem |
|----------|------|--------|-----------|
| Transcrição de áudio para texto | **Quant** | ✅ Implementado | Whisper/Gemini. Salvo em `transcriptions`. |
| Identificação automática de falantes (diarização) | **Qual/NLP** | ❌ Não iniciado | Requer diarização (pyannote.audio ou AssemblyAI). Output: segmentos com `speaker_id`. |
| Marcação de timestamps por fala | **Quant** | ❌ Não iniciado | Depende de diarização com timestamps. Salvar como JSON de segmentos. |
| Detecção de silêncios e pausas longas | **Quant** | ❌ Não iniciado | Pré-processamento de áudio (librosa ou similar). Salvar intervalos de silêncio. |
| Limpeza de ruídos de fundo | **Operacional** | ❌ Não iniciado | Pré-processamento (denoise) antes da transcrição. APIs como Dolby.io. |
| Filtragem de conversas paralelas | **Qual/NLP** | ❌ Não iniciado | Pós-diarização: marcar segmentos como "relevante" ou "não relevante". |
| Remoção de trechos não relacionados | **Qual/NLP** | ❌ Não iniciado | Prompt especial: "Identifique e marque trechos fora do contexto de venda." |
| Detecção de qualidade do áudio | **Quant** | ❌ Não iniciado | Score de qualidade (SNR, clareza). Salvo como campo em `audio_files`. |
| Segmentação da conversa em fases | **Qual → Quant** | ❌ Não iniciado | **Analisador Modal: Segmentação de Fases.** Prompt específico identifica abordagem/sondagem/apresentação/negociação/fechamento + timestamps. Salvo em `analysis_jobs`. |
| Detecção de idioma | **Quant** | ❌ Não iniciado | Whisper já detecta. Salvar campo `language` em `transcriptions`. |

**Prioridade:** Diarização é o unlock principal. Sem ela, features 2, 3, 4, 6, 7 ficam bloqueadas.
**Recomendação técnica:** AssemblyAI oferece diarização + timestamps prontos via API. Alternativa open-source com pyannote.

---

### 3. ANÁLISE SEMÂNTICA E NLP

> **Todos os itens deste grupo são Qualitativos.** São produzidos por **Analisadores Modulares** via IA e salvos como JSON estruturado em `analysis_jobs`.

| Sub-item | Analisador Proposto | Schema de Output |
|----------|--------------------|--------------------|
| Extração de entidades (produtos, marcas, preços) | `entity_extractor` | `{products: [], brands: [], prices: []}` |
| Detecção de objeções do cliente | `objection_detector` | `[{type, text, timestamp, was_addressed}]` |
| Identificação de elogios e reclamações | `sentiment_classifier` | `[{type: "praise|complaint", text, target}]` |
| Análise de sentimento por trecho | `sentiment_classifier` | `[{segment, sentiment: "positive|neutral|negative", score}]` |
| Detecção de emoções | `emotion_detector` | `[{segment, emotion: enum, confidence}]` |
| Identificação de tópicos emergentes | `topic_extractor` | `{main_topics: [], emerging: []}` |
| Extração de palavras-chave | `keyword_extractor` | `{keywords: [{word, frequency, context}]}` |
| Detecção de menção a concorrentes | `competitor_detector` | `[{competitor, context, sentiment}]` |
| Identificação de gatilhos de compra | `purchase_trigger_detector` | `{triggers: [{type, text, timestamp}]}` |
| Detecção de urgência | `urgency_detector` | `{urgency_score: 0-100, signals: []}` |
| Identificação de barreiras à compra | `barrier_detector` | `[{barrier_type, description, was_overcome}]` |
| Análise de tom de voz | `tone_analyzer` | `{vendor_tone, client_tone, evolution: []}` |
| Perguntas cliente vs vendedor | `question_analyzer` | `{client_questions: [], vendor_questions: []}` |
| Ratio de tempo de fala | `speech_ratio` | `{vendor_pct, client_pct, other_pct}` (depende de diarização) |
| Detecção de interrupções | `interruption_detector` | `[{by, timestamp, impact}]` |

**Implementação:** Criar um endpoint `POST /analyze` que recebe `analyzer_type` + `audio_id` e executa o prompt correspondente. Cada resultado é salvo em `analysis_jobs` e indexado por `analyzer_type`.

---

### 4. CONSTRUTOR DE PROMPTS PERSONALIZADOS

| Sub-item | Tipo | Abordagem |
|----------|------|-----------|
| Interface visual para criar análises | **Operacional** | Nova página `prompt_builder.html`. |
| Editor de texto para prompts | **Operacional** | Textarea com sintaxe destacada. |
| Biblioteca de variáveis inseríveis | **Operacional** | Dropdown de `{{transcription}}`, `{{store}}`, `{{vendor}}`, etc. |
| Seleção de dados de contexto | **Operacional** | Checkboxes para incluir CRM, produto, etc. |
| Configuração de formato de saída | **Operacional** | Seletor: JSON / Texto livre / Tabela. |
| Editor de schema JSON | **Operacional** | Editor de schema com validação. |
| Testador de prompt com áudio de exemplo | **Operacional** | Seletor de áudio existente + botão "Testar". |
| Versionamento de prompts | **Quant** | Campo `version` + histórico em `custom_prompts`. |
| Duplicação de prompts | **Operacional** | Botão clone na lista de prompts. |
| Importação/exportação | **Operacional** | Export como JSON. Import via upload. |
| Biblioteca de templates pré-prontos | **Qual** | Templates dos 40 analisadores acima, pré-carregados. |
| Marketplace | **Operacional** | Fase futura — exige multi-tenancy estável. |
| Configuração de quando executar | **Operacional** | Regras: sempre / só quando venda / só quando perda. |
| Configuração de prioridade | **Operacional** | Campo `priority` (1-10) em `custom_prompts`. |
| Agendamento de análises | **Operacional** | Job queue (ex: cron no servidor). |

**Prioridade:** Editor básico + biblioteca de templates + testador → as demais features são extensões.

---

### 5. ANÁLISES PRÉ-CONFIGURADAS — CLIENTE OCULTO

#### 5.1 Checklist Zeiss V.6

Este é um **Analisador Modular Especializado: `zeiss_checklist_v6`**.

Cada item do checklist é verificado via IA contra a transcrição. A IA retorna:
```json
{
  "checklist_version": "zeiss_v6",
  "score": 18,
  "max_score": 22,
  "items": [
    {"item": "Cumprimentou o cliente?", "result": true, "evidence": "trecho...", "timestamp": 12},
    {"item": "Perguntou se conhece a marca ZEISS?", "result": true, "evidence": "...", "timestamp": 45},
    ...
  ]
}
```

**Itens analisados (todos via IA contra transcrição):**
1. Cumprimentou o cliente → busca saudação inicial
2. Perguntou sobre marca ZEISS → busca menção explícita ou implícita
3. Explicou sobre a ZEISS → busca explicação de benefícios/história
4. Usou lensômetro → busca menção ao instrumento ou ação
5. Limpou com lens wipes → busca menção ao procedimento
6. Usou ultrassônico → busca menção ao uso
7. Perguntou profissão → busca pergunta sobre trabalho
8. Perguntou eletrônicos → busca pergunta sobre uso de telas
9. Perguntou esportes → busca pergunta sobre atividade física
10. Perguntou sobre dirigir → busca pergunta sobre direção
11. Perguntou sensibilidade à luz → busca pergunta sobre fotofobia
12. Comentou iTerminal/Visufit → busca menção ao sistema
13. Realizou medição com equipamento → busca ação de medir
14. Ofertou lente de maior valor primeiro → ordem de oferta identificada
15. Ofertou tecnologias adicionais → busca Photofusion, antivírus, etc.
16. Explicou lentes ZEISS com clareza → avaliação de qualidade da explicação
17. Demonstrou interesse genuíno → análise de engajamento (qualitativo)
18. Utilizou recurso visual → busca menção a tablet, demotool, bloco
19. Usou VisuConsult → busca menção ao app
20. Consultou tabela de preços → busca menção à consulta
21. Solicitou contato → busca pedido de telefone/email
22. Houve follow-up em 7 dias → verificado via tabela `followups` (Quant)

**Item 22 é híbrido:** a IA não pode verificar o follow-up em si, mas o banco registra se houve contato pós-visita.

#### 5.2 Checklist Genérico Personalizável

Implementar via tabela `checklist_templates`:
```json
{
  "name": "Checklist Personalizado",
  "items": [
    {
      "id": "item_1",
      "label": "Cumprimentou o cliente?",
      "weight": 1.5,
      "mandatory": true,
      "trigger_keywords": ["oi", "olá", "bom dia"],
      "context": "início da conversa"
    }
  ],
  "scoring": {
    "type": "weighted", 
    "max": 100
  }
}
```

A IA usa este JSON para preencher o checklist item a item.

---

### 6. MÉTRICAS DE VENDAS

**Tipo: Majoritariamente Quantitativo** — extraído do banco após análises.

| Métrica | Fonte de Dado | Requisto |
|---------|--------------|----------|
| ROI por conversa | BD: `resultado_venda` / tempo investido | Precisa de campo `sale_amount` em `audio_files` |
| Custo por conversa | BD: duração × custo/hora do vendedor | Precisa de `vendor_cost_per_hour` em `vendors` |
| Taxa de conversão | BD: count(vendas) / count(conversas) | Precisa de campo `outcome: sold|not_sold` |
| Ticket médio por conversa | BD: avg(sale_amount) | Campo `sale_amount` |
| Ticket médio premium vs não premium | BD + Análise IA: `was_premium_offered` | Analisador `upsell_detector` |
| Ticket médio por vendedor | BD: join com `vendors` | Tabela `vendors` |
| Ticket médio por loja | BD: join com `stores` | Tabela `stores` |
| Ticket por dia da semana | BD: extract(dow from created_at) | Nativo após `outcome` |
| Ticket por horário | BD: extract(hour from created_at) | Nativo |
| Ticket por duração | BD: duration_seconds vs sale_amount | Nativo |
| Margem por conversa | BD: sale_amount - custo | Precisa de dados de produto |
| Desconto médio | BD: campo `discount_given` | Precisa de campo específico |
| Eficiência de conversa | BD: sale_amount / duration_minutes | Calculado |
| Tempo médio de conversa | BD: avg(duration_seconds) | Salvar no upload |
| Tempo por fase | IA: segmentação de fases + timestamps | Analisador `phase_segmenter` |
| Comparativo vendedor vs média | BD: agregação e comparação | Dashboard específico |
| Evolução temporal de métricas | BD: série temporal | Gráficos de linha |

**Ação principal:** Adicionar campos `outcome`, `sale_amount`, `discount_given`, `duration_seconds` em `audio_files`.

---

### 7. OPORTUNIDADES DE VENDA

**Tipo: Qualitativo → Quantitativo (Híbrido)**

#### 7.1 Cross-Sell Não Realizado
- **Analisador:** `cross_sell_analyzer`
- **Output:** Lista de produtos complementares não oferecidos + valor estimado perdido
- **Banco:** Tabela `missed_opportunities` com `type: cross_sell`

#### 7.2 Up-Sell Possível
- **Analisador:** `upsell_analyzer`
- **Output:** Score de propensão premium do cliente + identificação de versão superior não oferecida
- **Banco:** Campo `upsell_opportunity_detected: bool` + detalhes em `analysis_jobs`

#### 7.3 Oportunidades Perdidas Genéricas
- **Analisador:** `lost_opportunity_analyzer`
- **Output:** Lista categorizada: interesse não explorado, promoção não mencionada, serviço adicional, programa de fidelidade
- **Relatório:** Valor total de oportunidades perdidas por loja/vendedor/período

**Para calcular valor de oportunidade perdida:** cruzar com catálogo de produtos (`product_catalog`) e margens médias.

---

### 8. PRODUTOS PEDIDOS vs PRODUTOS APRESENTADOS

**Tipo: Qualitativo → Estruturado para Quant**

- **Analisador:** `product_coverage_analyzer`
- **Output estruturado:**
```json
{
  "products_asked": ["lente progressive", "antirrisco"],
  "products_shown": ["Zeiss Individual 2", "DuraVision BlueProtect"],
  "gap": ["lente progressive não apresentada por nome correto"],
  "proactive_offers": ["Photofusion não pedida, mas ofertada"],
  "unknown_products": [],  
  "casual_mentions": ["cliente mencionou 'óculos de sol' mas não explorado"]
}
```
- **Relatório Quant:** % de cobertura de pedidos, taxa de proatividade, produtos mais desconhecidos

---

### 9. TENDÊNCIAS DE COMPORTAMENTO

**Tipo: Quantitativo** — requer volume de dados acumulados.

| Tendência | Como Calcular |
|-----------|--------------|
| Padrão de horário de maior fluxo | `GROUP BY hour(created_at)` em `audio_files` |
| Dia da semana com maior conversão | `GROUP BY dow, outcome` |
| Tendências sazonais | Série temporal por mês/semana |
| Evolução de objeções | `GROUP BY objeção_type, mês` de `detected_objections` |
| Produtos em alta | `GROUP BY product_name, semana` em `products_mentioned` |
| Perfil de cliente ao longo do tempo | Série temporal de análise `client_profiling` |
| Evolução de sentimento | Série temporal de `sentiment_classifier` |
| Padrões de recompra | Join `audio_files` com histórico de CRM |

**Ação:** Criar view materializada ou job de agregação diária para performance em dashboards.

---

### 10. TEMPO DE PERMANÊNCIA NA LOJA

**Tipo: Quantitativo** com **suporte Qualitativo nas fases**.

| Sub-item | Fonte |
|----------|-------|
| Duração total | BD: `duration_seconds` em `audio_files` |
| Tempo por fase | IA: `phase_segmenter` → timestamps por fase |
| Correlação duração × conversão | BD: scatter plot `duration_seconds` vs `outcome` |
| Conversas longas improdutivas | BD: filter `duration > threshold AND outcome = not_sold` |
| Conversas curtas com alta conversão | BD: filter `duration < threshold AND outcome = sold` |
| Tempo até primeira menção de produto | IA: `phase_segmenter` → timestamp fase "apresentação" |
| Tempo até apresentação de preço | IA: `entity_extractor` → primeiro timestamp com preço |
| Tempo de decisão | IA: `phase_segmenter` → duração fase "negociação + fechamento" |

---

### 11. PREFERÊNCIAS POR ESTILOS/ASSUNTOS

**Tipo: Qualitativo**

- **Analisador:** `engagement_analyzer`
- **Output:** Mapa de tópicos que geram engajamento positivo vs negativo no cliente
- **Banco:** `analysis_jobs` com `analyzer_type: engagement_analyzer`
- **Relatório:** Tag cloud de temas com +/- impacto, filtrável por loja/vendedor

---

### 12. CAPTURA DE OBSERVAÇÕES

**Tipo: Operacional + Qualitativo**

- Campo livre é texto armazenado em `manual_notes` (tabela nova)
- Fotos da loja: upload no Supabase Storage, metadado em nova tabela `audit_photos`
- Checklist físico (iluminação, temperatura, etc.): formulário vinculado à missão
- Avaliação pessoal do vendedor: campo estruturado em `missions_results`

---

### 13. CRÍTICAS VELADAS

**Tipo: Qualitativo — Alta complexidade**

- **Analisador:** `implicit_negative_detector`
- **O que analisa:**
  - Linguagem indireta ("acho que vou pensar..." = evasão)
  - Tom sarcástico ("muito interessante..." com entonação neutra — limitado em texto)
  - Comparações desfavoráveis sutis
  - Desculpas educadas para não comprar
  - Silêncios após proposta (depende de diarização com timestamps)
  - Mudança de tom durant a conversa
  - Respostas evasivas
- **Output:** `{implicit_negatives: [{type, evidence, impact_score, timestamp}]}`
- **Limitação:** Detecção de tom sarcástico em texto escrito tem precisão limitada. Requer transcrição com indicação de entonação (prosody).

---

### 14. ANÁLISE DE INTENÇÃO

**Tipo: Qualitativo → Score Quant (Híbrido)**

- **Analisador:** `purchase_intent_scorer`
- **Output:**
```json
{
  "intent_score": 78,
  "classification": "pronto para comprar",
  "high_intent_signals": ["perguntou preço", "pediu prazo", "tocou no produto"],
  "low_intent_signals": [],
  "best_followup": {"timing": "2 dias", "channel": "whatsapp", "approach": "oferta personalizada"},
  "peak_receptivity_timestamp": 340
}
```
- **Relatório Quant:** Distribuição de scores por loja, correlação score × resultado real

---

### 15. PERCEPÇÃO DE PERFIL PSICOLÓGICO

**Tipo: Qualitativo — Alta complexidade**

- **Analisador:** `psychological_profiler`
- **Classifica por:**
  - Arquétipo: racional, emocional, social, conservador
  - Estilo de decisão: analítico, impulsivo, consultivo
  - Sensibilidade preço vs qualidade
  - Velocidade de decisão
  - Nível de conhecimento prévio
  - Grau de ceticismo vs confiança
- **Output JSON estruturado** → salvo em `analysis_jobs`
- **Uso:** Personalização de abordagem por perfil detectado

---

### 16. ANÁLISE DE PERFIL DE CLIENTE

**Tipo: Híbrido** — parte inferida pela IA, parte extraída de CRM/banco.

| Sub-item | Fonte |
|----------|-------|
| Segmentação demográfica inferida | IA: `client_profiler` (inferência por linguagem) |
| Ocupação/profissão | IA: `entity_extractor` + banco |
| Frequência de compra | BD: histórico de CRM integrado |
| Poder aquisitivo estimado | IA: inferência por vocabulário + produtos pedidos |
| Lifetime value estimado | BD: histórico de vendas do CRM |
| Canais de aquisição | BD: campo `acquisition_channel` |
| Produtos preferidos historicamente | BD: histórico de compras |
| Sensibilidade a promoções | IA: `behavioral_analyzer` |

---

### 17. COMPARAÇÃO E BENCHMARKING

**Tipo: Quantitativo** — requer agregações no banco.

Estrutura de ranking:
```sql
SELECT vendor_id, store_id, 
  AVG(score) as avg_checklist_score,
  AVG(intent_score) as avg_intent,
  COUNT(CASE WHEN outcome='sold' THEN 1 END)::float / COUNT(*) as conversion_rate
FROM audio_files af
JOIN analysis_jobs aj ON aj.audio_id = af.id
GROUP BY vendor_id, store_id
ORDER BY conversion_rate DESC;
```

**Dashboard:** Tabela rankeada com identificação de outliers (Z-score > 2 = destaque positivo/negativo).

---

### 18. BIBLIOTECA DE MELHORES PRÁTICAS

**Tipo: Qualitativo + Operacional**

- Repositório de conversas exemplares: filtro `score >= 90` em `analysis_jobs`
- Busca por situação: full-text search na tabela `transcriptions`
- **Analisador:** `best_practice_tagger` — etiqueta conversas com técnicas utilizadas
- Banco: tabela `practice_library` com referências a `audio_id` + tags + descrição
- **Interface:** Página de busca com filtros por: tipo de cliente, objeção, produto, técnica

---

### 19. DETECÇÃO DE OBJEÇÕES E RESPOSTAS

**Tipo: Qualitativo → Quantitativo (Híbrido)**

- **Analisador:** `objection_response_analyzer`
- **Output:**
```json
{
  "objections": [
    {
      "type": "preço muito alto",
      "timestamp": 145,
      "vendor_response": "explicou parcelas...",
      "response_type": "reformulação_de_valor",
      "outcome": "superada",
      "sale_result": "sold"
    }
  ]
}
```
- **Relatório Quant:** Taxa de sucesso por tipo de resposta, objeções mais comuns por produto

---

### 20. ANÁLISE DE CONFORMIDADE

**Tipo: Qualitativo → Compliance Booleano (Híbrido)**

- **Analisador:** `compliance_checker`
- **Verifica:**
  - Menção a garantia legal? ✓/✗
  - Informações enganosas detectadas? ✓/✗
  - Seguiu script obrigatório? Score %
  - Promessas não respaldadas detectadas? ✓/✗
- **Alertas:** Se `compliance_score < threshold`, notificação automática ao gerente
- **Banco:** Tabela `compliance_alerts` com severity e evidência

---

### 21. TREINAMENTO E DESENVOLVIMENTO

**Tipo: Operacional + IA**

- Gaps identificados automaticamente: cruzar `checklist_score` por item com cada `vendor_id`
- Trilha personalizada: IA gera plano baseado nos 3 piores itens do vendedor
- Áudios de referência por gap: busca na `practice_library` por gap específico
- Gamificação: tabela `vendor_badges` + ranking semanal
- Simulador de conversas: chat com IA simulando cliente → avaliação automática do vendedor

---

### 22. DASHBOARDS E VISUALIZAÇÕES

**Tipo: Operacional — Frontend**

Proposta de dashboards:

| Dashboard | Usuário | Métricas Principais |
|-----------|---------|---------------------|
| Executivo | Diretor | ROI, conversão geral, ranking de lojas, tendências |
| Gerencial | Gerente Regional | Lojas sob sua gestão, alertas, top performers |
| Operacional | Gerente de Loja | Vendedores da loja, checklists, oportunidades perdidas |
| Individual | Vendedor | Seu score, suas oportunidades de melhoria, histórico |

**Construtor drag-and-drop:** Fase futura. Usar biblioteca como `Gridstack.js` ou similar.

---

### 23. INTEGRAÇÃO COM SISTEMAS EXTERNOS

**Tipo: Técnico/Operacional**

| Integração | Prioridade | Abordagem |
|------------|-----------|-----------|
| CRM (HubSpot/Salesforce) | Alta | Webhooks + OAuth. Sincronizar cliente, venda, follow-up. |
| PDV/Sistema de vendas | Alta | Confirmar `outcome` e `sale_amount` automaticamente. |
| WhatsApp Business | Média | API oficial ou Meta Cloud API para enviar relatórios. |
| ERP | Baixa | Exportação CSV + API REST para consumo. |
| E-commerce | Baixa | Correlacionar compra online com visita offline. |
| Webhooks configuráveis | Média | Endpoint de saída configurável por evento. |
| API REST externa | Média | Documentação OpenAPI + autenticação API Key. |
| Export CSV/Excel | Alta | Download de qualquer relatório. |

---

### 24. GESTÃO DE CATÁLOGO DE PRODUTOS

**Tipo: Operacional**

- Nova tabela: `product_catalog`
- Campos: `id, name, category, complementary_ids[], upsell_ids[], margin_pct, keywords[], price_range, arguments_json`
- Alimenta os analisadores de cross-sell, up-sell, cobertura de produtos
- Interface: CRUD simples em nova página `products.html`

---

### 25. GESTÃO DE LOJAS E TERRITÓRIOS

**Tipo: Operacional**

- Tabelas: `stores`, `regions`
- Hierarquia: `regions > cities > stores`
- Metas: tabela `store_goals` com `metric, target, period`
- Interface: `stores.html` com mapa e tabela

---

### 26. GESTÃO DE USUÁRIOS E PERMISSÕES

**Tipo: Operacional + Segurança**

Supabase RLS + tabela `user_roles`:
```
Admin > Gerente Regional > Gerente de Loja > Vendedor > Auditor
```
- Permissões granulares: `can_view_other_vendors`, `can_delete_audio`, etc.
- Logs de auditoria: tabela `audit_log` com `user_id, action, resource_id, timestamp`
- MFA: habilitado via Supabase Auth

---

### 27. PLAYER DE ÁUDIO SINCRONIZADO

**Tipo: Frontend**

- Já existe player básico em `chat.html`
- Melhorias: waveform (Wavesurfer.js), clique na transcrição → pula tempo, bookmarks via `audio_bookmarks`

---

### 28. TRANSCRIÇÃO INTERATIVA

**Tipo: Frontend**

- Editor de transcrição: `contenteditable` com save no banco
- Destaque de entidades: aplicar highlights com `entity_extractor` output
- Busca full-text: campo de busca que usa `LIKE` ou índice FTS no Supabase
- Anotações em trechos: tabela `transcript_annotations`

---

### 29. EXPORTAÇÃO E COMPARTILHAMENTO

**Tipo: Operacional**

- PDF: `jsPDF` ou endpoint de geração server-side com HTML template
- CSV: download de query results
- Link de compartilhamento: token de acesso temporário
- Email: Supabase Edge Function + SendGrid/Resend
- PowerPoint: `pptxgenjs` para geração automática

---

### 30. ALERTAS E NOTIFICAÇÕES

**Tipo: Operacional**

- Real-time: Supabase Realtime para notificações no browser
- Não conformidade: Trigger no Supabase após `compliance_score < threshold`
- Metas: job diário que verifica `store_goals` vs resultados reais
- Email/Push: via Supabase Edge Functions + serviço de email

---

### 31. ANÁLISE COMPETITIVA

**Tipo: Qualitativo**

- **Analisador:** `competitor_analyzer`
- Alimenta relatório de posicionamento: com que frequência cada concorrente é citado e com qual sentimento
- Banco: `detected_competitors` com frequência agregada por período

---

### 32. ANÁLISE DE LINGUAGEM E COMUNICAÇÃO

**Tipo: Qualitativo**

- **Analisador:** `communication_style_analyzer`
- Analisa: complexidade vocabular, ratio perguntas abertas/fechadas, identificação de técnicas (SPIN, BANT), empatia demonstrada, escuta ativa (reformulação)
- **Output:** Score por dimensão + exemplos de melhores trechos

---

### 33. DETECÇÃO DE MOMENTOS CRÍTICOS

**Tipo: Qualitativo → Timestamp Quant**

- **Analisador:** `critical_moment_detector`
- Identifica: momento de virada, perda, maior engajamento, desconexão
- **Output:** `[{type: "turning_point|loss_point|decision", timestamp, context}]`
- Visualização: Linha do tempo colorida sincronizada com player (Heatmap)

---

### 34. ANÁLISE DE FOLLOW-UP

**Tipo: Quantitativo** (após dados de `followups` acumularem)

- Taxa de conversão em follow-up vs primeira visita
- Eficácia por abordagem (whatsapp vs ligação vs email)
- Tempo ideal para follow-up (correlação `days_to_followup` × `conversion`)

---

### 35. SIMULADOR DE CONVERSAS COM IA

**Tipo: IA Generativa**

- Interface de role-play: vendedor digita, IA age como cliente com perfil configurável
- Feedback automático ao final: score em cada dimensão do checklist
- Progressão: perfis de cliente progressivamente mais difíceis
- **Backend:** endpoint dedicado `/simulate` com persona de cliente injetada no system prompt

---

### 36. MARKETPLACE DE ANÁLISES

**Tipo: Operacional**

- Fase futura após multi-tenancy
- Compartilhamento de `custom_prompts` com campo `public: bool`
- Rating e download de prompts da comunidade

---

### 37. CONFIGURAÇÕES DE MODELO DE IA

**Tipo: Operacional** — já parcialmente implementado.

- Expandir `user_settings` com: `temperature`, `max_tokens`, `fallback_model`
- Monitoramento de uso: já temos `usage_telemetry`
- Fallback automático: lógica no servidor para tentar modelo alternativo em caso de erro 429

---

### 38. COMPLIANCE E PRIVACIDADE

**Tipo: Técnico/Legal**

- Anonimização: regex + IA para mascarar nomes próprios, CPFs, telefones na transcrição
- Retenção: job de limpeza automática após N dias configurável
- Consentimento: tela de aceite antes de upload com log em `consent_log`
- Exportação LGPD: endpoint para exportar todos os dados de um `user_id`

---

### 39. ANÁLISE PREDITIVA

**Tipo: IA/ML — Avançado**

| Previsão | Abordagem |
|----------|-----------|
| Probabilidade de conversão | ML: train em histórico de `outcome + features` |
| Ticket médio estimado | Regressão em histórico |
| Risco de churn | Padrões de comportamento ao longo do tempo |
| Melhor horário para follow-up | Análise de `conversion_rate` por `followup_time` |
| Produto com maior chance de venda | Colaborativo: clientes similares + perfil atual |

**Fase:** Implementar após 6+ meses de dados acumulados.

---

### 40. HEATMAP DE CONVERSA

**Tipo: Frontend + IA**

- Visualização: eixo X = tempo da conversa, eixo Y = intensidade emocional
- Alimentado por: `sentiment_classifier` com timestamps
- Cores: vermelho (negativo/tenso), verde (positivo/engajado), cinza (neutro)
- Marcadores: fases da conversa, momentos críticos, objeções
- **Biblioteca:** D3.js para renderização customizada

---

## ORDEM DE IMPLEMENTAÇÃO SUGERIDA

### FASE 1 — Fundação (1-2 meses)
**Objetivo:** Criar a infraestrutura para tudo mais.

1. ✅ Expandir `audio_files` com: `outcome`, `sale_amount`, `duration_seconds`, `vendor_id`, `store_id`, `mission_id`
2. ✅ Criar tabelas: `stores`, `vendors`, `missions`, `product_catalog`
3. ✅ Criar tabela `analysis_jobs` (hub de todos os analisadores modulares)
4. ✅ Criar tabela `detected_objections`, `missed_opportunities`, `products_mentioned`
5. ✅ Criar sistema de "Analisadores Modulares" no backend
6. ✅ Integrar diarização (AssemblyAI ou pyannote) para timestamps por falante

### FASE 2 — Checklists e Análise Core (2-3 meses)
**Objetivo:** Tornar o produto utilizável para o caso de uso principal (Cliente Oculto).

1. ✅ Implementar Checklist Zeiss V.6 como analisador modular
2. ✅ Implementar Checklist Genérico configurável
3. ✅ Implementar `phase_segmenter`, `objection_detector`, `entity_extractor`
4. ✅ Criar relatório de checklist por missão
5. ✅ Dashboard por vendedor e por loja

### FASE 3 — Relatórios Quantitativos (2-3 meses)
**Objetivo:** Extrair valor dos dados já acumulados.

1. ✅ Relatórios de métricas de vendas (seção 6)
2. ✅ Tendências de comportamento (seção 9)
3. ✅ Benchmarking (seção 17)
4. ✅ Gestão de usuários e permissões (seção 26)
5. ✅ Exportação e compartilhamento (seção 29)

### FASE 4 — Análises Avançadas (3-4 meses)
1. ✅ Perfil psicológico, intenção de compra, críticas veladas
2. ✅ Construtor de prompts personalizados
3. ✅ Análise de follow-up
4. ✅ Simulador de conversas
5. ✅ Heatmap de conversa

### FASE 5 — Integrações e Escalabilidade (Ongoing)
1. ✅ CRM, PDV, WhatsApp integrations
2. ✅ Análise preditiva (ML)
3. ✅ Marketplace de análises
4. ✅ App mobile para gravação

---

## REVISÃO DO MÉTODO DE CLASSIFICAÇÃO ATUAL

### Problema Atual
O sistema usa **um único `classification_prompt` genérico** executado uma vez por áudio.

### Proposta: Sistema de Analisadores Modulares

```
NOVO FLUXO:

audio_files
    ↓ [trigger: novo áudio com transcrição]
analysis_queue (job por analisador)
    ↓
[Analisadores paralelos, independentes:]
  ├── phase_segmenter        → fases + timestamps
  ├── zeiss_checklist_v6     → score do checklist
  ├── objection_detector     → objeções detectadas
  ├── entity_extractor       → produtos, valores, marcas
  ├── sentiment_classifier   → sentimento por trecho
  ├── purchase_intent_scorer → score de intenção
  ├── cross_sell_analyzer    → oportunidades de cross-sell
  └── [custom_prompts]       → análises do usuário
    ↓
analysis_jobs (cada resultado salvo com analyzer_type, output_json, cost, version)
    ↓
Relatórios Quantitativos (aggregations no banco)
Relatórios Qualitativos (display do output_json dos analisadores)
```

### Vantagens do Novo Modelo
1. **Modular:** Cada análise pode ser re-executada individualmente
2. **Versionada:** `prompt_version` permite comparar resultados entre versões de prompt
3. **Auditável:** Custo e tempo de cada análise rastreados
4. **Extensível:** Adicionar novo analisador = novo registro em `prompt_library`, sem alterar o fluxo
5. **Re-executável:** Usuário pode re-analisar áudios antigos com novos prompts

---

## RESUMO EXECUTIVO

| Categoria | Qtd. Funcionalidades | % Quant | % Qual | % Híbrido | Prazo Estimado |
|-----------|---------------------|---------|--------|-----------|----------------|
| Captura de Áudio | 10 | 40% | 10% | 50% | Fase 1+4 |
| Processamento | 10 | 30% | 40% | 30% | Fase 1+2 |
| NLP e Semântica | 15 | 0% | 70% | 30% | Fase 2+4 |
| Construtor de Prompts | 15 | 10% | 10% | 80% | Fase 4 |
| Checklists | 30 | 10% | 70% | 20% | Fase 2 |
| Métricas de Vendas | 17 | 90% | 10% | 0% | Fase 3 |
| Oportunidades | 15 | 20% | 50% | 30% | Fase 2+3 |
| Dashboards | 9 | 80% | 10% | 10% | Fase 3 |
| Compliance | 10 | 40% | 40% | 20% | Fase 3+5 |
| Análise Preditiva | 5 | 30% | 70% | 0% | Fase 5 |

**A jornada completa de implementação cobre 4 a 6 fases ao longo de 12 a 18 meses, dependendo da equipe disponível.**

O alicerce de tudo é a Fase 1: expandir o schema do banco + criar o sistema de Analisadores Modulares. Com isso no lugar, cada funcionalidade se torna um "plugin" independente.
