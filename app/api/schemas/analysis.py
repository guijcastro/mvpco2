from pydantic import BaseModel
from typing import List, Literal, Optional, Dict, Any

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

class ConversionData(BaseModel):
    sale_completed: bool
    loss_reason: str

class TicketData(BaseModel):
    final_value_mentioned: float
    discount_percentage: float
    premium_offer_made: bool

class TimingData(BaseModel):
    time_to_first_product_mention_seconds: int

class SalesMetrics(BaseModel):
    conversion: ConversionData
    ticket: TicketData
    timing: TimingData
    efficiency_score: float # 0-100

class SpeakerInference(BaseModel):
    seller_talk_ratio: float   # 0-1
    client_talk_ratio: float   # 0-1
    interruptions_detected: int
    open_questions_by_seller: int
    closed_questions_by_seller: int

class PhaseData(BaseModel):
    phase_name: str
    start_turn: int
    end_turn: int
    duration_estimate: int

class ConversationStructure(BaseModel):
    phases: List[PhaseData]
    sale_concluded: bool
    total_turns: int

class PurchaseIntent(BaseModel):
    intent_score: float    # 0-100
    intent_classification: Literal["BROWSING", "PESQUISANDO", "PRONTO", "URGENTE"]
    urgency_detected: bool
    urgency_evidence: str

class SentimentData(BaseModel):
    seller: Literal["positive", "neutral", "negative"]
    client: Literal["positive", "neutral", "negative"]

class EmotionData(BaseModel):
    emotion: str
    intensity: float
    role: Literal["VENDEDOR", "CLIENTE"]

class EntitiesData(BaseModel):
    products: List[str]
    prices: List[float]
    brands: List[str]
    competitors: List[str]

class NLPAnalysis(BaseModel):
    sentiment: SentimentData
    emotions_detected: List[EmotionData]
    entities: EntitiesData
    keywords_frequency: Dict[str, int]
    buy_triggers_detected: List[str]
    urgency_detected: bool
    urgency_evidence: str

class Objection(BaseModel):
    objection_type: str
    objection_text: str
    turn_id: Optional[str] = None
    vendor_response_text: str
    objection_resolved: bool
    phase: str

class OpportunityItem(BaseModel):
    product_name: str
    reason: str

class LostOpportunities(BaseModel):
    total_estimated_value_loss: float
    cross_sell_not_offered: List[OpportunityItem]
    upsell_not_offered: List[OpportunityItem]
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
    turn_id: Optional[str] = None

class CompetitorMention(BaseModel):
    competitor_name: str
    comparison_direction: Literal["better", "worse", "neutral", "price_only"]
    client_statement: str

class CompetitiveAnalysis(BaseModel):
    competitors_mentioned: List[CompetitorMention]
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
