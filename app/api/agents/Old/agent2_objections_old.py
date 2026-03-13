from pipeline.e4_validator import call_llm_with_schema
from pydantic import BaseModel
from typing import List
from schemas.analysis import Objection

class Agent2Output(BaseModel):
    items: List[Objection]

async def run(client_turns: list, objections_ontology: list) -> dict:
    """
    Agente 2: Objeções.
    Apenas lê as falas do cliente e detecta resistência/dúvidas baseando-se na taxonomia.
    """
    if not client_turns:
        return {"items": []}
        
    client_speech = "\n".join([f"C: {t.text}" for t in client_turns])
    
    prompt = f"""Você é um auditor psicológico de vendas.
As possíveis objeções mapeadas da nossa marca são: {objections_ontology}

Leia a transcrição exclusiva das falas do Cliente abaixo.
Sua missão é extrair QUAISQUER objeções ou resistências de vendas (ex: preço, modelo, cônjuge, urgência) levantadas pelo cliente e dizer se o vendedor conseguiu contornar.

Falas do Cliente:
{client_speech}

Retorne strict JSON correspondendo a lista de Objections.
"""
    try:
        resultado = await call_llm_with_schema(prompt, Agent2Output)
        return resultado.model_dump()
    except Exception as e:
        print(f"Agent 2 falhou: {e}")
        return {"items": []}
