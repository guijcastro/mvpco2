import asyncio
from typing import Dict, Any, List
from agents import (
    agent1_checklist,
    agent2_objections,
    agent3_intent,
    agent4_sentiment,
    agent5_profile,
    agent6_opportunities,
    agent7_synthesis
)

async def run_agents(e2_output: dict, turns: list, ontology: dict, api_keys: dict) -> dict:
    """
    E3: Orquestra a execução de 7 Agentes LLM.
    A1-A6 rodam em paralelo usando asyncio.gather para máxima eficiência de I/O.
    A7 aguarda e sumariza o resultado dos anteriores.
    """
    client_turns = [t for t in turns if t.role == "CLIENTE"]
    vendor_turns = [t for t in turns if t.role == "VENDEDOR"]

    a1, a2, a3, a5, a6 = await asyncio.gather(
        agent1_checklist.run(e2_output.get("checklist_evidence", []), turns, ontology, api_keys),
        agent2_objections.run(client_turns, ontology.get("objections", []), api_keys),
        agent3_intent.run(client_turns, e2_output.get("entities", {}), api_keys),
        agent5_profile.run(client_turns, e2_output.get("metrics", {}), api_keys),
        agent6_opportunities.run(e2_output.get("entities", {}), ontology.get("products", []), client_turns, api_keys),
    )

    # Agente 4 roda por fase da conversa separadamente e junta os resultados
    a4 = await agent4_sentiment.run_per_phase(e2_output.get("phases", []), turns, api_keys)

    # Agente 7 consolida (Sintese)
    a7 = await agent7_synthesis.run(a1, a2, a3, a4, a5, a6, api_keys)

    return {
        "agent1": a1,
        "agent2": a2,
        "agent3": a3,
        "agent4": a4,
        "agent5": a5,
        "agent6": a6,
        "agent7": a7
    }
