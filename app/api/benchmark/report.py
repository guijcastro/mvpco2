"""
api/benchmark/report.py — Gerador de relatório comparativo dos benchmarks
Lê os JSONs de resultado e imprime uma tabela comparativa no terminal.

Uso:
    cd api
    python -m benchmark.report                  # lê todos os resultados
    python -m benchmark.report --agent agent2   # filtra por agente
    python -m benchmark.report --best           # mostra só o melhor por agente
"""

import json
import argparse
from pathlib import Path

RESULTS_DIR = Path(__file__).parent / "results"

AGENTS = ["agent1", "agent2", "agent3", "agent4", "agent5", "agent6", "agent7"]

AGENT_LABELS = {
    "agent1": "Checklist",
    "agent2": "Objeções",
    "agent3": "Intenção",
    "agent4": "Sentimento",
    "agent5": "Perfil",
    "agent6": "Oportunidades",
    "agent7": "Síntese",
}


def load_latest_results(agent_filter: Optional[str] = None) -> dict[str, list[dict]]:
    """Carrega o resultado mais recente de cada agente."""
    results = {}
    agents = [agent_filter] if agent_filter else AGENTS

    for agent_id in agents:
        files = sorted(RESULTS_DIR.glob(f"{agent_id}_*.json"), reverse=True)
        if not files:
            continue
        latest = json.loads(files[0].read_text(encoding="utf-8"))
        results[agent_id] = latest

    return results


def print_report(results: dict[str, list[dict]], show_best_only: bool = False):
    """Imprime tabela comparativa dos resultados."""
    for agent_id, entries in results.items():
        label = AGENT_LABELS.get(agent_id, agent_id)
        print(f"\n{'═'*75}")
        print(f"  AGENTE {agent_id[-1]} — {label.upper()}")
        print(f"{'═'*75}")
        print(f"  {'Modelo':<30} {'Lat(ms)':>8} {'$/call':>10} {'Schema':>8} {'Erros':>6}")
        print(f"  {'-'*65}")

        # Ordenar por schema_pass_rate desc, depois por custo asc
        sorted_entries = sorted(
            [e for e in entries if e["n_ok"] > 0],
            key=lambda e: (-e["schema_pass_rate"], e["avg_cost_usd"])
        )

        for i, e in enumerate(sorted_entries):
            if show_best_only and i > 0:
                break
            star = " ◀ RECOMENDADO" if i == 0 else ""
            model_label = f"{e['provider']}/{e['model'].split('/')[-1]}"
            print(
                f"  {model_label:<30}"
                f" {e['avg_latency_ms']:>7}ms"
                f" ${e['avg_cost_usd']:>9.6f}"
                f" {e['schema_pass_rate']*100:>7.0f}%"
                f" {e['error_rate']*100:>5.0f}%"
                f"{star}"
            )

        # Exibir erros de schema do melhor modelo
        best = sorted_entries[0] if sorted_entries else None
        if best and best["schema_pass_rate"] < 1.0:
            print(f"\n  ⚠️  Erros de schema no modelo recomendado:")
            for run in best["runs"]:
                for err in run.get("schema_errors", []):
                    print(f"     - {err}")

    print(f"\n{'═'*75}")
    print("  TABELA DE DECISÃO (preencher após revisar os resultados):")
    print(f"{'═'*75}")
    for agent_id in results:
        label = AGENT_LABELS.get(agent_id, agent_id)
        entries = results[agent_id]
        best = sorted(
            [e for e in entries if e["n_ok"] > 0],
            key=lambda e: (-e["schema_pass_rate"], e["avg_cost_usd"])
        )
        if best:
            b = best[0]
            print(f"  {agent_id} ({label:<14}): {b['model'].split('/')[-1]:<25} ${b['avg_cost_usd']:.6f}/call  {b['schema_pass_rate']*100:.0f}% schema")


def main():
    parser = argparse.ArgumentParser(description="MVPCO Benchmark Report")
    parser.add_argument("--agent", choices=AGENTS, help="Filtrar por agente específico")
    parser.add_argument("--best",  action="store_true", help="Mostrar apenas o melhor modelo por agente")
    args = parser.parse_args()

    results = load_latest_results(args.agent)
    if not results:
        print("❌ Nenhum resultado encontrado em api/benchmark/results/")
        print("   Execute primeiro: python -m benchmark.runner --all")
        return

    print_report(results, show_best_only=args.best)


# Necessário para type hint dentro do módulo
from typing import Optional

if __name__ == "__main__":
    main()
