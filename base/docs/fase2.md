# FASE 2 — Pipeline de Classificação (Core do Produto)

> Leia [PLANEJAMENTO.md](../PLANEJAMENTO.md). Pré-requisito: [Fase 1](fase1.md) 100% validada.

## Status

🔴 **NÃO INICIADA**

## Objetivo

Implementar o pipeline de 5 etapas (E1→E5) inteiramente em Python/FastAPI. Cada atendimento gera um JSON com **20 top-level keys** em schema fixo, validado por Pydantic e persistido em 6 tabelas relacionais.

> [!CAUTION]
> **Regra absoluta:** O LLM nunca recebe a transcrição inteira. Cada agente recebe contexto mínimo e responde a UMA pergunta com schema Pydantic obrigatório.

---

## Schema Completo de Output (Seção 4 do docx)

O objeto final persiste em `conversation_analysis.analysis_data` (JSONB). São exatamente 20 top-level keys:

```python
# api/schemas/analysis.py (Pydantic v2)

class ChecklistItem(BaseModel):
    item_key: str
    item_label: str
    result: Literal["pass", "fail", "not_applicable"]
    source: Literal["DETERMINISTIC", "LLM_AGENT_1"]
    evidence: str
    confidence: float  # 0-1
    weight: int

class ChecklistSummary(BaseModel):
    total_score: float      # 0-100, ponderado por peso
    items_passed: int
    items_failed: int
    items_uncertain: int
    items: List[ChecklistItem]

class SalesMetrics(BaseModel):
    conversion: dict        # sale_completed: bool, loss_reason: str
    ticket: dict            # final_value_mentioned, discount_percentage, premium_offer_made
    timing: dict            # time_to_first_product_mention_seconds, etc.
    efficiency_score: float # 0-100

class SpeakerInference(BaseModel):
    seller_talk_ratio: float   # 0-1
    client_talk_ratio: float   # 0-1
    interruptions_detected: int
    open_questions_by_seller: int
    closed_questions_by_seller: int

class ConversationStructure(BaseModel):
    phases: List[dict]     # [{phase_name, start_turn, end_turn, duration_estimate}]
    sale_concluded: bool
    total_turns: int

class PurchaseIntent(BaseModel):
    intent_score: float    # 0-100
    intent_classification: Literal["BROWSING", "PESQUISANDO", "PRONTO", "URGENTE"]
    urgency_detected: bool
    urgency_evidence: str

class NLPAnalysis(BaseModel):
    sentiment: dict        # {seller: pos|neu|neg, client: pos|neu|neg}
    emotions_detected: List[dict]  # [{emotion, intensity, role}]
    entities: dict         # {products, prices, brands, competitors}
    keywords_frequency: dict  # {word: count} top 20
    buy_triggers_detected: List[str]
    urgency_detected: bool
    urgency_evidence: str

class Objection(BaseModel):
    objection_type: str
    objection_text: str
    turn_id: Optional[str]
    vendor_response_text: str
    objection_resolved: bool
    phase: str

class LostOpportunities(BaseModel):
    total_estimated_value_loss: float
    cross_sell_not_offered: List[dict]
    upsell_not_offered: List[dict]
    implicit_needs_not_addressed: List[str]
    products_requested_not_shown: List[str]
    products_shown_not_requested: List[str]

class PsychologicalProfile(BaseModel):
    archetype: Literal["RACIONAL", "EMOCIONAL", "SOCIAL", "CONSERVADOR"]
    decision_style: str
    risk_profile: str
    trust_level_towards_seller: str

class CustomerProfile(BaseModel):
    inferred_age_range: str
    inferred_gender: Literal["male", "female", "non_binary", "uncertain"]
    inferred_socioeconomic_class: str
    estimated_purchasing_power: str
    price_sensitivity: Literal["high", "medium", "low", "uncertain"]
    purchase_type: Literal["new_customer", "returning_customer", "uncertain"]
    preferred_communication_style: str

class BehavioralTrends(BaseModel):
    client_engagement_level: Literal["high", "medium", "low"]
    client_knowledge_level: Literal["expert", "intermediate", "novice"]
    repurchase_signal: bool

class CriticalMoment(BaseModel):
    moment_type: Literal["TURNAROUND", "PERDA", "OBJECTION", "DECISAO", "ENGAJAMENTO"]
    timestamp_pct: float
    description: str

class HiddenCriticism(BaseModel):
    type: str
    description: str
    severity: Literal["high", "medium", "low"]
    turn_id: Optional[str]

class CompetitiveAnalysis(BaseModel):
    competitors_mentioned: List[dict]  # [{competitor_name, comparison_direction, client_statement}]
    loss_to_competitor_risk: Literal["high", "medium", "low"]

class Compliance(BaseModel):
    abusive_practice_detected: bool
    abusive_practice_description: str
    unfulfillable_promise_detected: bool
    unfulfillable_promise_description: str
    warranty_mentioned: bool
    consumer_rights_mentioned: bool
    mandatory_script_followed: bool
    compliance_score: float  # 0-100
    compliance_alerts: List[str]

class CommunicationAnalysis(BaseModel):
    empathy_demonstrated: bool
    active_listening_signals: bool
    language_complexity: Literal["technical", "balanced", "simple"]
    jargon_usage: Literal["high", "medium", "low"]
    personalization_score: float  # 0-100
    sales_techniques_detected: List[str]

class FollowUp(BaseModel):
    contact_info_collected: bool
    follow_up_promised: bool
    contact_type_collected: Literal["phone", "email", "whatsapp", "multiple", "none"]
    follow_up_timeframe_mentioned: str

class HeatmapSegment(BaseModel):
    segment_index: int
    intensity: float  # 0-1
    sentiment: str
    phase: str

class Predictive(BaseModel):
    churn_risk: Literal["high", "medium", "low"]
    best_follow_up_window: str
    projected_ticket: float

class FullAnalysisOutput(BaseModel):
    checklist: ChecklistSummary
    sales_metrics: SalesMetrics
    speaker_inference: SpeakerInference
    conversation_structure: ConversationStructure
    purchase_intent: PurchaseIntent
    nlp_analysis: NLPAnalysis
    objections: List[Objection]
    lost_opportunities: LostOpportunities
    psychological_profile: PsychologicalProfile
    customer_profile: CustomerProfile
    behavioral_trends: BehavioralTrends
    critical_moments: List[CriticalMoment]
    hidden_criticisms: List[HiddenCriticism]
    competitive_analysis: CompetitiveAnalysis
    compliance: Compliance
    communication_analysis: CommunicationAnalysis
    follow_up: FollowUp
    conversation_heatmap: List[HeatmapSegment]
    predictive: Predictive
    # (nota: 19 keys acima + a chave de metadados = 20 total)
```

---

## E1 — Parsing de Turnos com spaCy

### `api/pipeline/e1_parser.py` — [ ] Pendente

**Algoritmo completo:**

```python
import spacy
import re
from api.schemas.turns import ConversationTurn, ParsedTranscription

SPEAKER_PATTERNS = [
    r"^(Vendedor|V|Atendente)\s*:",
    r"^(Cliente|C)\s*:",
    r"^(Terceiro|T)\s*:",
]

def parse_transcription(text: str, nlp) -> ParsedTranscription:
    """
    E1: Converte texto bruto em array de turnos estruturados.
    Técnicas aplicadas:
    - Detecção de marcadores explícitos (Vendedor:, Cliente:, V:, C:)
    - Fallback: heurística posicional alternada com parágrafo como separador
    - spaCy para: tokenização, expansão de abreviações, limpeza de ruídos
    - Cálculo de confidence_score baseado na taxa de marcadores encontrados
    """
    # 1. Tentar detecção de marcadores explícitos
    turns = _parse_with_markers(text)
    confidence = _calc_confidence(turns, text)

    # 2. Fallback para heurística posicional
    if confidence < 0.6 or not turns:
        turns = _parse_positional(text, nlp)
        confidence = 0.4  # heurística tem confiança menor

    # 3. Normalização com spaCy
    turns = _normalize_turns(turns, nlp)

    return ParsedTranscription(
        turns=turns,
        confidence_score=confidence,
        manual_review=confidence < 0.6,
        parsing_method="marker" if confidence >= 0.6 else "positional"
    )

def _parse_with_markers(text: str) -> list[ConversationTurn]:
    """Detecta Vendedor:/Cliente: explícitos e divide em turnos."""
    ...

def _parse_positional(text: str, nlp) -> list[ConversationTurn]:
    """Divide por parágrafos, alterna V/C/V/C baseado na posição."""
    ...

def _normalize_turns(turns: list, nlp) -> list[ConversationTurn]:
    """
    spaCy: tokenização, remoção de ruídos, expansão de contrações.
    Salva token_count por turno para métricas de fala (E2).
    """
    ...

def _calc_confidence(turns: list, original_text: str) -> float:
    """Ratio de parágrafos com marcador explícito encontrado."""
    ...
```

**Critério:** Testado com 3 transcrições reais. Accuracy de role assignment ≥ 90%.

---

## E2 — Extração Determinística com spaCy NER

### `api/pipeline/e2_extractor.py` — [ ] Pendente

**Técnicas aplicadas:**
- `spaCy NER` (pt_core_news_lg) para entidades nominais (pessoas, organizações, locais)
- `PhraseMatcher` do spaCy para detecção de produtos, equipamentos e concorrentes
- `regex` calibrados para preços (`R$\s*[\d.,]+`, numerais extensos)
- Checklist matching por janela e role (15 itens determinísticos)

```python
from spacy.matcher import PhraseMatcher
import re

def extract_signals(turns: list, nlp, ontology: dict) -> dict:
    """
    E2: Varredura computacional sobre os turnos.
    Output: entities, checklist_evidence, metrics, phases
    """

    # --- Extração de Entidades ---
    price_pattern = re.compile(r'R\$\s*([\d.,]+)|(\w+ reais|\w+ mil)')
    competitor_matcher = _build_phrase_matcher(nlp, ontology["competitors"])
    product_matcher = _build_phrase_matcher(nlp, ontology["products"])
    equipment_matcher = _build_phrase_matcher(nlp, ontology["equipment"])

    entities = {
        "prices": [],       # valores extraídos
        "products": [],     # produtos Zeiss detectados
        "competitors": [],  # concorrentes mencionados
        "equipment": [],    # equipamentos usados
        "brands": []        # marcas em geral (spaCy NER ORG)
    }

    for turn in turns:
        doc = nlp(turn.text)
        _extract_prices(doc, price_pattern, entities, turn)
        _extract_products(doc, product_matcher, entities, turn)
        _extract_competitors(doc, competitor_matcher, entities, turn)
        # NER spaCy para ORG (marcas não catalogadas)
        for ent in doc.ents:
            if ent.label_ == "ORG":
                entities["brands"].append(ent.text)

    # --- Métricas de Fala ---
    vendor_turns = [t for t in turns if t.role == "VENDEDOR"]
    client_turns = [t for t in turns if t.role == "CLIENTE"]
    total_tokens = sum(t.token_count for t in turns)
    vendor_tokens = sum(t.token_count for t in vendor_turns)

    metrics = {
        "seller_talk_ratio": vendor_tokens / total_tokens if total_tokens > 0 else 0,
        "client_talk_ratio": 1 - (vendor_tokens / total_tokens) if total_tokens > 0 else 0,
        "open_questions_by_seller": _count_open_questions(vendor_turns, nlp),
        "closed_questions_by_seller": _count_closed_questions(vendor_turns, nlp),
        "interruptions_detected": _detect_interruptions(turns),
    }

    # --- Checklist Determinístico (15 itens) ---
    checklist_evidence = _match_checklist(turns, ontology["checklist"])

    # --- Segmentação de Fases ---
    phases = _segment_phases(turns, entities)

    return { "entities": entities, "checklist_evidence": checklist_evidence, "metrics": metrics, "phases": phases }

def _count_open_questions(turns: list, nlp) -> int:
    """Turnos do VENDEDOR terminando em '?' com ≥ 5 tokens = pergunta aberta."""
    ...

def _match_checklist(turns: list, checklist: list) -> list:
    """
    Para cada item com requires_llm=False:
    - Filtra turnos pelo role e window definidos no JSON
    - Aplica PhraseMatcher com as keywords do item
    - Retorna verdict DETERMINÍSTICO com evidência e turn_id
    """
    ...

def _segment_phases(turns: list, entities: dict) -> list:
    """
    Identifica fases: saudacao, anamnese, demonstracao, objecao, fechamento.
    Usa padrões de turno + presença de entidades detectadas como heurística.
    """
    ...
```

**Critério:** 15 itens do checklist extraídos deterministicamente. Entidades (produtos, preços, concorrentes) detectadas corretamente em transcrição de teste.

---

## E3 — 7 Agentes LLM

### `api/pipeline/e3_agents.py` (Orquestrador) — [ ] Pendente

```python
import asyncio
from api.agents import agent1, agent2, agent3, agent4, agent5, agent6, agent7
from api.pipeline.e4_validator import validate_agent_output

async def run_agents(e2_output: dict, turns: list, ontology: dict) -> dict:
    """
    Executa os 7 agentes. A1-A6 podem rodar em paralelo (sem dependência entre si).
    A7 executa por último, recebendo os outputs de todos.
    """
    client_turns = [t for t in turns if t.role == "CLIENTE"]
    vendor_turns = [t for t in turns if t.role == "VENDEDOR"]

    a1, a2, a3, a5, a6 = await asyncio.gather(
        agent1.run(e2_output["checklist_evidence"], turns, ontology),
        agent2.run(client_turns, ontology["objections"]),
        agent3.run(client_turns, e2_output["entities"]),
        agent5.run(client_turns, e2_output["metrics"]),
        agent6.run(e2_output["entities"], ontology["products"], client_turns),
    )

    # Agente 4 executa em loop por fase
    a4 = await agent4.run_per_phase(e2_output["phases"], turns)

    # Agente 7 recebe outputs estruturados, NUNCA a transcrição
    a7 = await agent7.run(a1, a2, a3, a4, a5, a6)

    return { "agent1": a1, "agent2": a2, "agent3": a3, "agent4": a4, "agent5": a5, "agent6": a6, "agent7": a7 }
```

### Agente 1 — `api/agents/agent1_checklist.py` — [ ] Pendente

- **Input:** 7 itens `requires_llm=true` + turnos relevantes + entidades E2
- **Schema Pydantic de output por item:**
```python
class ChecklistItemLLM(BaseModel):
    item_key: str
    verdict: Literal["SIM", "NÃO", "INCONCLUSIVO"]
    confidence: float  # 0-1
    evidence: str      # trecho textual que justifica o veredicto
    turn_id: Optional[int]
```
- Re-execução automática se Pydantic falhar (máx 2 tentativas com prompt de correção explícito)

### Agente 2 — `api/agents/agent2_objections.py` — [ ] Pendente

- **Input:** Turnos do CLIENTE + `objection_taxonomy.json`
- **Schema de output (por objeção detectada):**
```python
class ObjectionResult(BaseModel):
    type: str        # um dos 9 tipos
    text: str
    turn_id: int
    vendor_response_text: str
    efficacy: Literal["CONTORNOU", "NAO_CONTORNOU", "PARCIAL"]
    phase: str
```

### Agente 3 — `api/agents/agent3_intent.py` — [ ] Pendente

- **Input:** Turnos CLIENTE + objeções (Agente 2) + entidades E2
- **Chain-of-Thought interno obrigatório** (campo `cot_reasoning` no output)
```python
class IntentResult(BaseModel):
    intent_score: int   # 0-100
    intent_classification: Literal["BROWSING", "PESQUISANDO", "PRONTO", "URGENTE"]
    cot_reasoning: str  # obrigatório
    urgency_detected: bool
    urgency_evidence: str
    buy_triggers_detected: List[str]
```

### Agente 4 — `api/agents/agent4_sentiment.py` — [ ] Pendente

- **Executa em loop por fase** (não por transcrição inteira)
- **Input por iteração:** segmentos de UMA fase + role do falante
```python
class SentimentPhaseResult(BaseModel):
    phase: str
    sentiment_label: Literal["positive", "neutral", "negative"]
    intensity: float   # 0-1
    dominant_emotion: Literal["frustração", "entusiasmo", "dúvida", "satisfação", "pressa", "tédio"]

class SentimentResult(BaseModel):
    per_phase: List[SentimentPhaseResult]
    conversation_heatmap: List[HeatmapSegment]  # para Chart.js
```

### Agente 5 — `api/agents/agent5_profile.py` — [ ] Pendente

- **Input:** Turnos CLIENTE + métricas de fala E2
```python
class ProfileResult(BaseModel):
    psychological_profile: PsychologicalProfile
    customer_profile: CustomerProfile
    behavioral_trends: BehavioralTrends
```

### Agente 6 — `api/agents/agent6_opportunities.py` — [ ] Pendente

- **Input:** Entidades detectadas + `product_catalog.json` + turnos CLIENTE
```python
class OpportunitiesResult(BaseModel):
    total_estimated_value_loss: float
    cross_sell_not_offered: List[dict]
    upsell_not_offered: List[dict]
    implicit_needs_not_addressed: List[str]
    products_requested_not_shown: List[str]
    products_shown_not_requested: List[str]
```

### Agente 7 — `api/agents/agent7_synthesis.py` — [ ] Pendente

- **Input:** Outputs estruturados dos Agentes 1–6. **Nunca a transcrição.**
```python
class SynthesisResult(BaseModel):
    summary_narrative: str         # 3-5 parágrafos
    strengths: List[str]
    improvements: List[str]
    training_recommendation: str
    compliance: Compliance
    communication_analysis: CommunicationAnalysis
    follow_up: FollowUp
    competitive_mentions: List[dict]
    loss_to_competitor_risk: Literal["high", "medium", "low"]
    critical_moments: List[CriticalMoment]
    hidden_criticisms: List[HiddenCriticism]
    sales_techniques_detected: List[str]
    predictive: Predictive
```

---

## E4 — Validação e Consolidação

### `api/pipeline/e4_validator.py` — [ ] Pendente

```python
from pydantic import ValidationError

def validate_and_consolidate(e2_output: dict, agents_output: dict) -> FullAnalysisOutput:
    """
    - Valida cada output de agente com seu schema Pydantic
    - Se inválido: re-executa com prompt de correção (max 2x)
    - Monta o objeto final FullAnalysisOutput
    - Adiciona source/evidence/turn_id a cada campo relevante
    - O LLM NUNCA monta o objeto consolidado — o código faz isso
    """
    ...
```

---

## E5 — Persistência

### `api/pipeline/e5_persist.py` — [ ] Pendente

Persiste em:
1. `conversation_turns` — output de E1
2. `conversation_entities` — output de E2
3. `checklist_results` — E2 (determinísticos) + Agente 1 (LLM)
4. `conversation_analysis` — FullAnalysisOutput serializado como JSONB
5. `objections` — Agente 2
6. `lost_opportunities` — Agente 6
7. `usage_telemetry` — tokens e custo de cada agente

---

## Frontend da Fase 2

### `public/upload.html` — [ ] Pendente

- Upload de áudio para Supabase Storage (bucket `audios`)
- Campos: nome da loja, nome do vendedor, data da visita
- Inserção em `audio_files` após confirmação do upload
- Chamada ao endpoint `/api/transcribe` para iniciar transcrição

### `public/index.html` — Botão "Analisar v2" — [ ] Pendente

- Spinner com feedback por etapa (E1, E2, Agentes...)
- Progresso via SSE (Server-Sent Events) ou polling a cada 2s
- Exibe resultado resumido (score checklist + intent) após conclusão

---

## Checklist de Validação da Fase 2

> [!CAUTION]
> **A Fase 3 só começa após TODOS os itens abaixo confirmados.**

- [ ] Upload em `upload.html` → arquivo aparece no bucket `audios`
- [ ] `POST /api/transcribe` retorna texto da transcrição salvo em `transcriptions`
- [ ] `POST /api/analyze-v2` retorna JSON com exatamente 20 top-level keys
- [ ] Pydantic valida o JSON sem erros
- [ ] `conversation_turns` salvo com roles corretos (≥ 90% de precisão em 3 transcrições)
- [ ] `checklist_results` salvo com 22 itens (15 determinísticos + 7 LLM)
- [ ] `objections` salvo com tipo e eficácia
- [ ] Agente 7 recebe apenas outputs estruturados (auditado no log da API)
- [ ] `usage_telemetry` registra custo por agente
- [ ] Falha de schema → agente reexecuta automaticamente (testado forçando schema inválido)
- [ ] Commit com tag `fase2-completa`

**→ Quando validado, avançar para [docs/fase3.md](fase3.md)**
