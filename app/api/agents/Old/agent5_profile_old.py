from pipeline.e4_validator import call_llm_with_schema
from schemas.analysis import PsychologicalProfile, CustomerProfile, BehavioralTrends
from pydantic import BaseModel

class ProfileResult(BaseModel):
    psychological_profile: PsychologicalProfile
    customer_profile: CustomerProfile
    behavioral_trends: BehavioralTrends

async def run(client_turns: list, metrics: dict) -> dict:
    """
    Agente 5: Perfil Psicológico e Behavioral Trends do cliente.
    """
    if not client_turns:
        return {}

    client_speech = "\n".join([f"C: {t.text}" for t in client_turns])
    
    prompt = f"""Você é um Profiler de Comportamento do Consumidor.
Baseado nas falas do cliente e nestas métricas de fala brutas: {metrics}

Falas do Cliente:
{client_speech}

Identifique o Perfil Psicológico (Ex: RACIONAL busca custo-benefício; EMOCIONAL julga estética).
Trace o Demográfico estimado (idade, gênero, poder aquisitivo) baseando-se no vocabulário abordado.
Determine as Tendências Comportamentais. Se não for possível afirmar gênero/idade, responda "uncertain" (em inglês).
Retorne o JSON ProfileResult estrito.
"""
    try:
        resultado = await call_llm_with_schema(prompt, ProfileResult)
        return resultado.model_dump()
    except Exception as e:
        print(f"Agent 5 falhou: {e}")
        return {}
