# FASE A — Benchmark e Seleção de IAs

> Leia [PLANEJAMENTO.md](../PLANEJAMENTO.md). Esta fase é executada **antes da Fase 2** e define qual provedor/modelo será usado em cada agente do pipeline.

## Status

🔴 **NÃO INICIADA**

## Posição no Plano

**Fase 1 → FASE A (esta) → Fase Parsing → Fase 2**

## Objetivo

Comparar os 4 provedores de LLM (ChatGPT, Claude, Gemini, Grok) nas tarefas específicas do pipeline de análise. A decisão de qual modelo usar em cada agente deve ser baseada em dados — custo, latência e qualidade de output medidos com transcrições reais, não com benchmarks genéricos da internet.

> [!IMPORTANT]
> **Resultado esperado desta fase:** uma tabela de decisão de modelo por agente baseada em dados reais coletados com transcrições do projeto. Os testes são feitos com o `relatorio.html` existente que já mede tokens, custo IA, custo servidor e latência.

---

## Modelos a Testar

| Provider | Modelos | Chave env |
|----------|---------|-----------|
| OpenAI | `gpt-4.1`, `gpt-4o`, `o3-mini` | `OPENAI_API_KEY` |
| Anthropic | `claude-opus-4-5`, `claude-sonnet-4-5`, `claude-haiku-4-5` | `ANTHROPIC_API_KEY` |
| Google | `gemini-2.5-pro`, `gemini-2.0-flash` | `GEMINI_API_KEY` |
| xAI | `grok-3`, `grok-3-mini` | `GROK_API_KEY` |

Os preços de cada modelo estão em `pricing.json` na raiz do projeto.

---

## Infraestrutura de Benchmark

### `api/benchmark/runner.py` — [ ] Pendente

```python
"""
Script de benchmark comparativo entre provedores LLM.
Executa os 7 prompts dos agentes com o mesmo contexto de entrada
e coleta: tokens_input, tokens_output, latency_ms, cost_usd, qualidade do schema.
"""
import time
import json
import asyncio
import litellm
from pathlib import Path
from datetime import datetime

MODELS_TO_TEST = [
    "gpt-4o",
    "gpt-4o-mini",
    "claude-sonnet-4-5",
    "claude-haiku-4-5",
    "gemini/gemini-2.5-pro",
    "gemini/gemini-2.0-flash",
    "xai/grok-3",
    "xai/grok-3-mini",
]

async def bench_one(model: str, prompt: str, system: str, schema: dict) -> dict:
    """
    Executa uma chamada LLM e retorna métricas completas.
    Usa litellm para abstração multi-provider.
    """
    start = time.perf_counter()
    try:
        response = await litellm.acompletion(
            model=model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.0,
            timeout=60,
        )
        latency_ms = round((time.perf_counter() - start) * 1000)
        usage = response.usage
        output_text = response.choices[0].message.content

        # Tentar parsear JSON e validar schema
        parsed = json.loads(output_text)
        schema_valid = _validate_schema(parsed, schema)

        return {
            "model": model,
            "status": "ok",
            "input_tokens": usage.prompt_tokens,
            "output_tokens": usage.completion_tokens,
            "total_tokens": usage.total_tokens,
            "latency_ms": latency_ms,
            "cost_usd": litellm.completion_cost(response),
            "schema_valid": schema_valid,
            "schema_errors": [] if schema_valid else _get_schema_errors(parsed, schema),
            "output_preview": output_text[:500],
        }
    except Exception as e:
        return {
            "model": model,
            "status": "error",
            "error": str(e),
            "latency_ms": round((time.perf_counter() - start) * 1000),
        }

async def run_benchmark(agent_id: str, prompt: str, system: str, schema: dict,
                        repetitions: int = 3) -> list[dict]:
    """
    Roda N repetições de cada modelo para capturar variabilidade.
    Salva resultados em api/benchmark/results/{agent_id}_{timestamp}.json
    """
    all_results = []
    for model in MODELS_TO_TEST:
        model_results = []
        for i in range(repetitions):
            result = await bench_one(model, prompt, system, schema)
            result["run"] = i + 1
            result["agent"] = agent_id
            model_results.append(result)
            await asyncio.sleep(1)  # evitar rate limit

        # Calcular médias
        ok_runs = [r for r in model_results if r["status"] == "ok"]
        if ok_runs:
            avg = {
                "model": model,
                "agent": agent_id,
                "avg_latency_ms": sum(r["latency_ms"] for r in ok_runs) / len(ok_runs),
                "avg_cost_usd": sum(r["cost_usd"] for r in ok_runs) / len(ok_runs),
                "avg_tokens": sum(r["total_tokens"] for r in ok_runs) / len(ok_runs),
                "schema_pass_rate": sum(1 for r in ok_runs if r["schema_valid"]) / len(ok_runs),
                "error_rate": (repetitions - len(ok_runs)) / repetitions,
                "runs": model_results,
            }
            all_results.append(avg)

    # Salvar resultado
    out_path = Path(f"api/benchmark/results/{agent_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json")
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(all_results, indent=2, ensure_ascii=False))
    print(f"✅ Benchmark salvo: {out_path}")
    return all_results
```

### `api/benchmark/prompts/` — [ ] Pendente (7 arquivos, um por agente)

Cada arquivo contém o prompt exato do agente com exemplo real de transcrição:
```
api/benchmark/prompts/
├── agent1_checklist.txt
├── agent2_objections.txt
├── agent3_intent.txt
├── agent4_sentiment.txt
├── agent5_profile.txt
├── agent6_opportunities.txt
└── agent7_synthesis.txt
```

**Critério:** Cada prompt usa input real de uma transcrição de atendimento do projeto.

---

## Testes por Agente

### Agente 1 — Checklist Ambíguo — [ ] Pendente

**O que medir:**
- Schema válido: `{item_key, verdict: SIM|NÃO|INCONCLUSIVO, confidence: 0-1, evidence: str, turn_id}`
- Qualidade da evidência: o trecho citado de fato suporta o veredicto?
- Falsos positivos: o modelo alucina evidências que não estão na transcrição?
- Consistência: rodar 3x o mesmo prompt → resulta no mesmo veredicto?

```bash
cd api && python -m benchmark.runner --agent agent1 --reps 3
```

### Agente 2 — Objeções e Eficácia — [ ] Pendente

**O que medir:**
- Detecção de objeções que existem mas são sutis (não verbalizadas diretamente)
- Classificação correta do tipo (9 opções da taxonomia)
- Avaliação de eficácia (`CONTORNOU/NAO_CONTORNOU/PARCIAL`): modelo conservador vs. generoso

### Agente 3 — Intenção de Compra (Chain-of-Thought) — [ ] Pendente

**O que medir:**
- Qualidade do `cot_reasoning`: é coerente e rastreável?
- Calibração do `intent_score`: 75 de um modelo ≡ 75 de outro?
- Detecção de urgência: falsos positivos vs. falsos negativos

**Critério especial:** Rodar com a mesma transcrição em que o cliente comprou ao final. O score final deve ser ≥ 70 ("PRONTO").

### Agente 4 — Sentimento por Fase — [ ] Pendente

**O que medir:**
- Separação de sentimento por fase (não por transcrição inteira)
- Capacidade de distinguir `dúvida` de `tédio` e `entusiasmo` de `pressa`
- Granularidade do `intensity` (0-1): modelos tendem a dar 0.5 como resposta genérica?

### Agente 5 — Perfil Psicológico — [ ] Pendente

**O que medir:**
- Consistência do arquétipo: rodar 3x → mesmo arquétipo?
- Qualidade de `decision_style` e `risk_profile`: genérico vs. específico
- Calibração de `price_sensitivity`: bate com a realidade da transcrição?

### Agente 6 — Oportunidades Perdidas — [ ] Pendente

**O que medir:**
- Precision: o que o modelo apontou como oportunidade perdida era real?
- Recall: quantas oportunidades reais ele deixou passar?
- Qualidade do `estimated_value`: razoável ou alucinado?

### Agente 7 — Síntese Qualitativa — [ ] Pendente

**O que medir:**
- Qualidade narrativa do `summary_narrative` (3-5 parágrafos)
- `strengths` e `improvements`: específicos ou genéricos demais?
- `training_recommendation`: aplicável ou vago?
- Conformidade: `compliance_score` consistente com os dados dos agentes 1-6?

---

## Dashboard de Resultados

### Usar o `relatorio.html` existente — [ ] Pendente (configuração)

O `relatorio.html` já exibe:
- **KPI:** Custo Tokens (IA), Custo Servidor (CPU), Volume Processado, Latência Média, Requisições Totais
- **Gráfico:** Custo financeiro por IA (doughnut) + Evolução de tráfego (linha)
- **Tabela:** Log detalhado das últimas 50 operações com modelo, tokens, latência e custo

**Para usar com o benchmark:** Garantir que o `runner.py` registra cada chamada na tabela `usage_telemetry` com `operation_type = 'benchmark_agent_N'`. O filtro de "Atividade" do `relatorio.html` já agrupa por `operation_type`.

**URL:** `http://localhost:8888/relatorio.html`

### `api/benchmark/report.py` — [ ] Pendente

Script que lê os JSONs de resultado e imprime tabela comparativa:

```
BENCHMARK RESULTS — AGENTE 2 — OBJEÇÕES
═══════════════════════════════════════════════════════════════════
Model                    Latency    Cost/call  Schema%  Errs
─────────────────────────────────────────────────────────────────
gemini-2.0-flash         1.2s       $0.000058   100%    0%
claude-haiku-4-5         2.1s       $0.000094   100%    0%
gpt-4o-mini              1.8s       $0.000041   100%    0%
grok-3-mini              1.5s       $0.000067    89%    0%
claude-sonnet-4-5        3.4s       $0.000380   100%    0%
gpt-4o                   2.9s       $0.000810   100%    0%
gemini-2.5-pro           4.1s       $0.000590   100%    0%
grok-3                   3.8s       $0.000440    93%    0%
═══════════════════════════════════════════════════════════════════
```

---

## Tabela de Decisão (a preencher após os testes)

| Agente | Modelo Escolhido | Justificativa | Custo/call | Schema% |
|--------|-----------------|---------------|-----------|---------|
| Agente 1 — Checklist LLM | _a definir_ | | | |
| Agente 2 — Objeções | _a definir_ | | | |
| Agente 3 — Intenção (CoT) | _a definir_ | | | |
| Agente 4 — Sentimento | _a definir_ | | | |
| Agente 5 — Perfil | _a definir_ | | | |
| Agente 6 — Oportunidades | _a definir_ | | | |
| Agente 7 — Síntese | _a definir_ | | | |

---

## Checklist de Validação da Fase A

> [!CAUTION]
> **A Fase de Parsing só começa após TODOS os itens confirmados.**

- [ ] `api/benchmark/runner.py` criado e funcional
- [ ] Prompts de todos os 7 agentes em `api/benchmark/prompts/`
- [ ] Benchmark rodado para TODOS os 7 agentes com ≥ 3 repetições por modelo
- [ ] Resultados JSON salvos em `api/benchmark/results/`
- [ ] Chamadas registradas em `usage_telemetry` (visíveis no `relatorio.html`)
- [ ] Tabela de decisão de modelo por agente preenchida e aprovada pelo usuário
- [ ] `pricing.json` atualizado com preços correntes de todos os modelos
- [ ] Commit com tag `fase-benchmark-completa`

**→ Quando validado, avançar para [docs/fase_parsing.md](fase_parsing.md)**
