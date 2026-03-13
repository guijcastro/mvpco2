"""
api/benchmark/runner.py — Benchmark comparativo de modelos LLM
Busca chaves de API do Supabase (tabela user_api_keys) — não usa .env.

Uso (WSL, dentro de api/):
    python -m benchmark.runner --token <JWT> --agent agent1 --reps 3
    python -m benchmark.runner --token <JWT> --all --reps 3

O token JWT pode ser obtido no browser após login:
    supabase.auth.getSession().then(s => console.log(s.data.session.access_token))
"""

import asyncio
import json
import os
import time
import argparse
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent.parent / ".env")

import litellm
litellm.telemetry = False

from supabase import create_client
from utils.encryption import decrypt_api_key, EncryptionError

# ─── Modelos a testar ────────────────────────────────────────────────────────
MODELS = [
    ("openai",     "gpt-5.2"),
    ("anthropic",  "claude-sonnet-4-6"),
    ("google",     "gemini/gemini-2.5-pro"),
    ("xai",        "xai/grok-3"),
]

AGENTS = ["agent1", "agent2", "agent3", "agent4", "agent5", "agent6", "agent7"]
PROMPTS_DIR = Path(__file__).parent / "prompts"
RESULTS_DIR = Path(__file__).parent / "results"

# Mapeamento provider → variável de ambiente do litellm
ENV_MAP = {
    "openai":    "OPENAI_API_KEY",
    "anthropic": "ANTHROPIC_API_KEY",
    "google":    "GEMINI_API_KEY",
    "xai":       "XAI_API_KEY",
}


def load_keys_from_supabase(jwt_token: str) -> dict[str, str]:
    """
    Busca as chaves de API criptografadas do Supabase e as descriptografa.
    Retorna dict provider -> plain_key.
    Lança RuntimeError se alguma chave não estiver configurada.
    """
    sb = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_KEY"])
    sb.auth.set_session(jwt_token, "")  # usa RLS do usuário

    res = sb.table("user_api_keys").select("provider,encrypted_key,is_active").execute()
    keys = {}
    for row in (res.data or []):
        if not row.get("is_active"):
            continue
        try:
            keys[row["provider"]] = decrypt_api_key(row["encrypted_key"])
        except EncryptionError as e:
            print(f"⚠️  Falha ao descriptografar chave de {row['provider']}: {e}")

    missing = [p for p, _ in MODELS if p not in keys]
    seen = set()
    missing_unique = [p for p in missing if not (p in seen or seen.add(p))]
    if missing_unique:
        raise RuntimeError(
            f"Chaves não configuradas para: {missing_unique}. "
            "Configure em Configurações → Chaves de API."
        )
    return keys


def inject_env_keys(keys: dict[str, str]):
    """Injeta as chaves descriptografadas nas variáveis de ambiente para o litellm."""
    for provider, plain_key in keys.items():
        env_var = ENV_MAP.get(provider)
        if env_var:
            os.environ[env_var] = plain_key


def load_prompt(agent_id: str) -> tuple[str, str, dict]:
    path = PROMPTS_DIR / f"{agent_id}.json"
    if not path.exists():
        raise FileNotFoundError(f"Prompt não encontrado: {path}")
    data = json.loads(path.read_text(encoding="utf-8"))
    return data["system"], data["user"], data["expected_schema"]


def _validate_schema(parsed: dict, schema: dict) -> tuple[bool, list[str]]:
    errors = []
    for key, spec in schema.items():
        if spec.get("required", True) and key not in parsed:
            errors.append(f"Chave obrigatória ausente: '{key}'")
        elif key in parsed:
            val = parsed[key]
            t = spec.get("type")
            if t == "list"   and not isinstance(val, list):   errors.append(f"'{key}' deveria ser list")
            if t == "number" and not isinstance(val, (int,float)): errors.append(f"'{key}' deveria ser number")
            if t == "string" and not isinstance(val, str):    errors.append(f"'{key}' deveria ser string")
            if t == "enum"   and val not in spec.get("values", []): errors.append(f"'{key}'='{val}' valor inválido")
    return (len(errors) == 0), errors


async def bench_one(provider: str, model: str, system: str, user: str, schema: dict) -> dict:
    start = time.perf_counter()
    try:
        response = await litellm.acompletion(
            model=model,
            messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
            response_format={"type": "json_object"},
            temperature=0.0,
            timeout=90,
        )
        latency_ms = round((time.perf_counter() - start) * 1000)
        usage = response.usage
        output_text = response.choices[0].message.content or ""
        try:
            parsed = json.loads(output_text)
            schema_valid, schema_errors = _validate_schema(parsed, schema)
        except json.JSONDecodeError as je:
            schema_valid, schema_errors, parsed = False, [f"JSON inválido: {je}"], {}
        try:    cost = litellm.completion_cost(response)
        except: cost = 0.0
        return {
            "provider": provider, "model": model, "status": "ok",
            "input_tokens": usage.prompt_tokens if usage else 0,
            "output_tokens": usage.completion_tokens if usage else 0,
            "total_tokens": usage.total_tokens if usage else 0,
            "latency_ms": latency_ms,
            "cost_usd": round(cost, 8),
            "schema_valid": schema_valid,
            "schema_errors": schema_errors,
            "output_preview": output_text[:600],
        }
    except Exception as e:
        return {
            "provider": provider, "model": model, "status": "error",
            "error": str(e),
            "latency_ms": round((time.perf_counter() - start) * 1000),
            "schema_valid": False, "schema_errors": [str(e)], "cost_usd": 0.0,
        }


async def run_benchmark(agent_id: str, repetitions: int = 3) -> list[dict]:
    print(f"\n{'='*60}\nBENCHMARK: {agent_id.upper()} — {repetitions} repetições por modelo\n{'='*60}")
    system, user, schema = load_prompt(agent_id)
    all_averages = []
    for provider, model in MODELS:
        print(f"\n  ▶ {provider}/{model}...")
        runs = []
        for i in range(repetitions):
            result = await bench_one(provider, model, system, user, schema)
            result["run"] = i + 1; result["agent"] = agent_id
            runs.append(result)
            icon = "✅" if result["status"] == "ok" and result["schema_valid"] else "❌"
            print(f"    Run {i+1}: {icon} {result['latency_ms']}ms — ${result['cost_usd']:.6f}")
            await asyncio.sleep(1.5)
        ok_runs = [r for r in runs if r["status"] == "ok"]
        all_averages.append({
            "agent": agent_id, "provider": provider, "model": model,
            "n_runs": repetitions, "n_ok": len(ok_runs),
            "error_rate": round((repetitions - len(ok_runs)) / repetitions, 2),
            "schema_pass_rate": round(sum(1 for r in ok_runs if r["schema_valid"]) / repetitions, 2),
            "avg_latency_ms": round(sum(r["latency_ms"] for r in ok_runs) / max(len(ok_runs), 1)),
            "avg_cost_usd": round(sum(r["cost_usd"] for r in ok_runs) / max(len(ok_runs), 1), 8),
            "avg_tokens_in": round(sum(r.get("input_tokens", 0) for r in ok_runs) / max(len(ok_runs), 1)),
            "avg_tokens_out": round(sum(r.get("output_tokens", 0) for r in ok_runs) / max(len(ok_runs), 1)),
            "runs": runs,
        })
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    out = RESULTS_DIR / f"{agent_id}_{ts}.json"
    out.write_text(json.dumps(all_averages, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"\n✅ Resultado salvo: {out}")
    return all_averages


async def run_all(jwt_token: str, repetitions: int = 3):
    keys = load_keys_from_supabase(jwt_token)
    inject_env_keys(keys)
    for agent_id in AGENTS:
        await run_benchmark(agent_id, repetitions)
        print("\n⏳ Aguardando 5s...")
        await asyncio.sleep(5)


def main():
    parser = argparse.ArgumentParser(description="MVPCO LLM Benchmark Runner")
    parser.add_argument("--token",  required=True, help="JWT do usuário (obtido após login no frontend)")
    parser.add_argument("--agent",  choices=AGENTS, help="Agente específico")
    parser.add_argument("--all",    action="store_true", help="Todos os agentes")
    parser.add_argument("--reps",   type=int, default=3)
    args = parser.parse_args()

    keys = load_keys_from_supabase(args.token)
    inject_env_keys(keys)
    print(f"✅ Chaves carregadas do Supabase: {list(keys.keys())}")

    if args.all:
        asyncio.run(run_all(args.token, args.reps))
    elif args.agent:
        asyncio.run(run_benchmark(args.agent, args.reps))
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
