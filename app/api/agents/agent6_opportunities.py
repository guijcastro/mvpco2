from pipeline.e4_validator import call_llm_with_schema
from schemas.analysis import LostOpportunities

async def run(entities: dict, products_ontology: list, client_turns: list, api_keys: dict) -> dict:
    """
    Agente 6: Oportunidades Perdidas (Cross-selling / Upselling).
    """
    client_speech = "\n".join([f"C: {t.text}" for t in client_turns]) if client_turns else "Sem falas do cliente."
    
    prompt = f"""Você é um Gerente de Vendas Sênior avaliando um atendente.
Analise os produtos do nosso catálogo: {products_ontology}
Entidades/produtos abordados na conversa: {entities}
Falas do Cliente indicando intenções/dores:
{client_speech}

Sua tarefa: Descubra quais produtos poderiam ter sido ofertados (cross-sell ou upsell) mas não foram.
Identifique necessidades implícitas que o vendedor ignorou e calcule uma perda de valor estimado financeiro.
Retorne o JSON preenchendo o schema LostOpportunities.
"""
    try:
        resultado = await call_llm_with_schema(prompt, LostOpportunities, api_keys)
        return resultado.model_dump()
    except Exception as e:
        print(f"Agent 6 falhou: {e}")
        return {
            "total_estimated_value_loss": 0.0,
            "cross_sell_not_offered": [],
            "upsell_not_offered": [],
            "implicit_needs_not_addressed": [],
            "products_requested_not_shown": [],
            "products_shown_not_requested": []
        }
