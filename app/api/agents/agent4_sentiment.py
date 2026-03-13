from pipeline.e4_validator import call_llm_with_schema
from schemas.analysis import HeatmapSegment
from pydantic import BaseModel
from typing import List, Literal

class SentimentPhaseResult(BaseModel):
    phase: str
    sentiment_label: Literal["positive", "neutral", "negative"]
    intensity: float   # 0-1
    dominant_emotion: Literal["frustração", "entusiasmo", "dúvida", "satisfação", "pressa", "tédio", "alegria", "nenhuma"]

class SentimentResult(BaseModel):
    per_phase: List[SentimentPhaseResult]
    conversation_heatmap: List[HeatmapSegment]

async def run_per_phase(phases: list, turns: list, api_keys: dict) -> dict:
    """
    Agente 4: Sentimento por Fase.
    Em vez de ler o audio inteiro e cuspir 1 valor, ele mapia o clima da Negociação.
    """
    if not phases or not turns:
        return {"per_phase": [], "conversation_heatmap": []}
    
    dialogue_context = "\n".join([f"{t.role}: {t.text}" for t in turns])
    
    prompt = f"""Você é especialista em Análise de Sentimento (Micro-Expressões verbais).
Temos a segmentação do atendimento em fases: {phases}

Diálogo Completo:
{dialogue_context}

Sua tarefa: Para cada fase listada, determine o label de sentimento do CLIENTE e a emoção dominante (frustração, entusiasmo, dúvida, etc).
Crie também um "HeatmapSegment" para cada 25% da interação, para plotarmos um gráfico de calor de emoção ao longo do tempo.
Responda APENAS o JSON Pydantic estruturado contendo a lista das fases e os segmentos do heatmap.
"""
    try:
        resultado = await call_llm_with_schema(prompt, SentimentResult, api_keys)
        return resultado.model_dump()
    except Exception as e:
        print(f"Agent 4 falhou: {e}")
        return {"per_phase": [], "conversation_heatmap": []}
