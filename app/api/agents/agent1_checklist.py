from pipeline.e4_validator import call_llm_with_schema
from schemas.analysis import ChecklistSummary

async def run(evidence_e2: list, turns: list, ontology: dict, api_keys: dict) -> dict:
    """
    Agente 1: Valida itens subjetivos do checklist.
    Recebe os itens já passados/falhos do E2 e avalia o restante.
    """
    # Filtra apenas a fala do vendedor para contexto limpo
    vendor_speech = "\n".join([f"V: {t.text}" for t in turns if t.role == "VENDEDOR"])
    client_speech = "\n".join([f"C: {t.text}" for t in turns if t.role == "CLIENTE"])
    
    prompt = f"""Você é um auditor de vendas de varejo auditando uma loja de ótica.
Consulte as regras do nosso Checklist para avaliar o vendedor.
Itens já encontrados automaticamente pelo sistema E2: {evidence_e2}

Falas do Vendedor:
{vendor_speech}

Falas do Cliente:
{client_speech}

Sua tarefa: Retorne a estrutura ChecklistSummary. Se um item não pode ser medido, marque "not_applicable".
Gere evidência clara e confidence score entre 0 e 1.
"""
    try:
        resultado = await call_llm_with_schema(prompt, ChecklistSummary, api_keys)
        return resultado.model_dump()
    except Exception as e:
        print(f"Agent 1 falhou: {e}")
        return {}
