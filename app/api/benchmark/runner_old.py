"""
api/benchmark/runner.py — Benchmark comparativo de modelos LLM
Testa os 4 providers (OpenAI, Anthropic, Google, xAI) nos 7 agentes do pipeline.

Uso:
    cd api
    python -m benchmark.runner --agent agent1 --reps 3
    python -m benchmark.runner --all --reps 3
"""

import asyncio
import json
import time
import argparse
from datetime import datetime
from pathlib import Path
from typing import Optional
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")

import litellm
litellm.telemetry = False

# ─── Modelos a testar ────────────────────────────────────────────────────────
MODELS = [
    ("openai",     "gpt-4o"),
    ("openai",     "gpt-4o-mini"),
    ("anthropic",  "claude-sonnet-4-5"),
    ("anthropic",  "claude-haiku-4-5"),
    ("google",     "gemini/gemini-2.5-pro"),
    ("google",     "gemini/gemini-2.0-flash"),
    ("xai",        "xai/grok-3"),
    ("xai",        "xai/grok-3-mini"),
]

AGENTS = ["agent1", "agent2", "agent3", "agent4", "agent5", "agent6", "agent7"]
PROMPTS_DIR = Path(__file__).parent / "prompts"
RESULTS_DIR = Path(__file__).parent / "results"


def load_prompt(agent_id: str) -> tuple[str, str, dict]:
    """Carrega system prompt, user prompt e schema esperado do arquivo do agente."""
    path = PROMPTS_DIR / f"{agent_id}.json"
    if not path.exists():
        raise FileNotFoundError(f"Prompt não encontrado: {path}")
    data = json.loads(path.read_text(encoding="utf-8"))
    return data["system"], data["user"], data["expected_schema"]


def _validate_schema(parsed: dict, schema: dict) -> tuple[bool, list[str]]:
    """
    Valida se o JSON retornado contém as chaves obrigatórias do schema.
    Retorna (is_valid, list_of_errors).
    """
    errors = []
    for key, spec in schema.items():
        if spec.get("required", True) and key not in parsed:
            errors.append(f"Chave obrigatória ausente: '{key}'")
        elif key in parsed:
            expected_type = spec.get("type")
            val = parsed[key]
            if expected_type == "list" and not isinstance(val, list):
                errors.append(f"'{key}' deveria ser list, recebeu {type(val).__name__}")
            elif expected_type == "number" and not isinstance(val, (int, float)):
                errors.append(f"'{key}' deveria ser number, recebeu {type(val).__name__}")
            elif expected_type == "string" and not isinstance(val, str):
                errors.append(f"'{key}' deveria ser string, recebeu {type(val).__name__}")
            elif expected_type == "enum" and val not in spec.get("values", []):
                errors.append(f"'{key}'='{val}' não é um valor válido: {spec['values']}")
    return (len(errors) == 0), errors


async def bench_one(provider: str, model: str, system: str, user: str, schema: dict) -> dict:
    """Executa uma chamada LLM e retorna métricas completas."""
    start = time.perf_counter()
    try:
        response = await litellm.acompletion(
            model=model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user",   "content": user},
            ],
            response_format={"type": "json_object"},
            temperature=0.0,
            timeout=90,
        )
        latency_ms = round((time.perf_counter() - start) * 1000)
        usage = response.usage
        output_text = response.choices[0].message.content or ""

        # Tentar parsear JSON
        try:
            parsed = json.loads(output_text)
            schema_valid, schema_errors = _validate_schema(parsed, schema)
        except json.JSONDecodeError as je:
            schema_valid = False
            schema_errors = [f"JSON inválido: {str(je)}"]
            parsed = {}

        # Custo via litellm
        try:
            cost = litellm.completion_cost(response)
        except Exception:
            cost = 0.0

        return {
            "provider": provider,
            "model": model,
            "status": "ok",
            "input_tokens":   usage.prompt_tokens if usage else 0,
            "output_tokens":  usage.completion_tokens if usage else 0,
            "total_tokens":   usage.total_tokens if usage else 0,
            "latency_ms":     latency_ms,
            "cost_usd":       round(cost, 8),
            "schema_valid":   schema_valid,
            "schema_errors":  schema_errors,
            "output_preview": output_text[:600],
        }

    except Exception as e:
        return {
            "provider": provider,
            "model": model,
            "status": "error",
            "error": str(e),
            "latency_ms": round((time.perf_counter() - start) * 1000),
            "schema_valid": False,
            "schema_errors": [str(e)],
            "cost_usd": 0.0,
        }


async def run_benchmark(agent_id: str, repetitions: int = 3) -> list[dict]:
    """
    Roda N repetições de cada modelo para o agente especificado.
    Salva resultados em api/benchmark/results/{agent_id}_{timestamp}.json
    """
    print(f"\n{'='*60}")
    print(f"BENCHMARK: {agent_id.upper()} — {repetitions} repetições por modelo")
    print(f"{'='*60}")

    system, user, schema = load_prompt(agent_id)
    all_averages = []

    for provider, model in MODELS:
        print(f"\n  ▶ {provider}/{model}...")
        runs = []
        for i in range(repetitions):
            result = await bench_one(provider, model, system, user, schema)
            result["run"] = i + 1
            result["agent"] = agent_id
            runs.append(result)
            status_icon = "✅" if result["status"] == "ok" and result["schema_valid"] else "❌"
            print(f"    Run {i+1}: {status_icon} {result['latency_ms']}ms — ${result['cost_usd']:.6f}")
            await asyncio.sleep(1.5)  # evitar rate limit

        ok_runs = [r for r in runs if r["status"] == "ok"]
        avg_entry = {
            "agent":           agent_id,
            "provider":        provider,
            "model":           model,
            "n_runs":          repetitions,
            "n_ok":            len(ok_runs),
            "error_rate":      round((repetitions - len(ok_runs)) / repetitions, 2),
            "schema_pass_rate": round(sum(1 for r in ok_runs if r["schema_valid"]) / repetitions, 2),
            "avg_latency_ms":  round(sum(r["latency_ms"] for r in ok_runs) / max(len(ok_runs), 1)),
            "avg_cost_usd":    round(sum(r["cost_usd"]   for r in ok_runs) / max(len(ok_runs), 1), 8),
            "avg_tokens_in":   round(sum(r.get("input_tokens",  0) for r in ok_runs) / max(len(ok_runs), 1)),
            "avg_tokens_out":  round(sum(r.get("output_tokens", 0) for r in ok_runs) / max(len(ok_runs), 1)),
            "runs": runs,
        }
        all_averages.append(avg_entry)

    # Salvar resultado
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    out_path = RESULTS_DIR / f"{agent_id}_{timestamp}.json"
    out_path.write_text(json.dumps(all_averages, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"\n✅ Resultado salvo: {out_path}")
    return all_averages


async def run_all(repetitions: int = 3):
    """Roda o benchmark para todos os 7 agentes sequencialmente."""
    for agent_id in AGENTS:
        await run_benchmark(agent_id, repetitions)
        print(f"\n⏳ Aguardando 5s antes do próximo agente...")
        await asyncio.sleep(5)


def main():
    parser = argparse.ArgumentParser(description="MVPCO LLM Benchmark Runner")
    parser.add_argument("--agent", choices=AGENTS, help="Agente específico a testar")
    parser.add_argument("--all",   action="store_true", help="Testar todos os agentes")
    parser.add_argument("--reps",  type=int, default=3, help="Repetições por modelo (default: 3)")
    args = parser.parse_args()

    if args.all:
        asyncio.run(run_all(args.reps))
    elif args.agent:
        asyncio.run(run_benchmark(args.agent, args.reps))
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
