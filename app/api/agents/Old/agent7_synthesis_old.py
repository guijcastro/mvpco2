from pipeline.e4_validator import call_llm_with_schema
from schemas.analysis import CriticalMoment, HiddenCriticism, CompetitiveAnalysis, Compliance, CommunicationAnalysis, FollowUp, Predictive
from pydantic import BaseModel
from typing import List

class SynthesisResult(BaseModel):
    critical_moments: List[CriticalMoment]
    hidden_criticisms: List[HiddenCriticism]
    competitive_analysis: CompetitiveAnalysis
    compliance: Compliance
    communication_analysis: CommunicationAnalysis
    follow_up: FollowUp
    predictive: Predictive

async def run(a1: dict, a2: dict, a3: dict, a4: dict, a5: dict, a6: dict) -> dict:
    """
    Agente 7: Síntese Final.
    NÃO LÊ A TRANSCRIÇÃO! Ele lê os outputs dos 6 Agentes anteriores para deduzir Momentos Críticos,
    Predictive Analytics, Compliance e Comunicação, custando muito menos tokens.
    """
    
    prompt = f"""Você é o Juiz Master da Inteligência Artificial Varejista.
Abaixo estão os laudos focados dos seus 6 auditores auxiliares:
- A1 Checklist: {a1}
- A2 Objeções: {a2}
- A3 Intenção: {a3}
- A4 Sentimento: {a4}
- A5 Perfil Psi: {a5}
- A6 Oportunidades: {a6}

Agregando essas conclusões, sem ler o diálogo cru, gere as análises sintéticas restantes demandadas no seu Schema (Momentos Críticos de perda/ganho baseados nisto, Risco de Churn (Predictive), Analysis da Comunicação e Follow up).
Seja preciso e não invente dados.
"""
    try:
        resultado = await call_llm_with_schema(prompt, SynthesisResult)
        return resultado.model_dump()
    except Exception as e:
        print(f"Agent 7 falhou: {e}")
        return {}
