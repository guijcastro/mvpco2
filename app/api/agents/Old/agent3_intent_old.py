from pipeline.e4_validator import call_llm_with_schema
from schemas.analysis import PurchaseIntent
from pydantic import BaseModel

class IntentResult(PurchaseIntent):
    cot_reasoning: str # Chain-of-thought exigido pelo Agent 3

async def run(client_turns: list, entities: dict) -> dict:
    """
    Agente 3: Intenção e Urgência.
    Avalia a urgência de compra do cliente com base no diálogo e nas entidades E2.
    """
    if not client_turns:
        # Fallback padrao se nao houver fala de cliente
        return {"intent_score": 0.0, "intent_classification": "BROWSING", "urgency_detected": False, "urgency_evidence": "", "cot_reasoning": "Sem falas."}

    client_speech = "\n".join([f"C: {t.text}" for t in client_turns])
    
    prompt = f"""Você é um auditor de análise de comportamento de compra.
Entidades/Produtos/Preços já detectados na conversa: {entities}

Falas do Cliente:
{client_speech}

Sua tarefa: Descubra o quão quente ou frio esse cliente está para comprar (0 a 100 de intent_score).
Determine se ele tem urgência ou é apenas sondagem (BROWSING, PESQUISANDO, PRONTO, URGENTE).
Escreva o seu raciocínio passo a passo no campo 'cot_reasoning' e extraia evidências literais se houver urgência.
"""
    try:
        resultado = await call_llm_with_schema(prompt, IntentResult)
        return resultado.model_dump()
    except Exception as e:
        print(f"Agent 3 falhou: {e}")
        return {"intent_score": 0.0, "intent_classification": "BROWSING", "urgency_detected": False, "urgency_evidence": ""}
