# FASE 3 (novoplano) — Relatórios Estruturados (SQL Views)

**O Primeiro Relatório Comparável Inter-Atendimento** · **Duração estimada:** ~3 semanas

## Visão Geral
Uma mudança drástica em relação ao v0: em vez dos renderers `r_*.js` efetuarem processamento sobre um `jsonb` de forma insegura, eles passarão a consultar Views SQL consolidadas preenchidas no passo recursivo (E5). Esta fase migra passo-a-passo para garantir que todos os dados extraídos pelo pipeline se convertam em painéis interativos Chart.js que operem sobre queries relacionalmente sólidas.

## Tarefas Detalhadas

| ID | Tarefa | Executor | Depende de | Critério de Aceitação |
|---|---|---|---|---|
| **T3.1** | **Criar SQL Views Primárias**<br>- Preencher as views: `vw_checklist_summary`, `vw_objections_by_type`, `vw_intent_distribution`, `vw_vendor_performance`, `vw_lost_opportunities`, `vw_speaker_metrics`, `vw_timing_analysis`. | IA (Antigravity) | Fase 2 | Views capazes de executar em <200ms com 100+ conversas na base. RLS respeitado para os 5 perfis. |
| **T3.2** | **Criar SQL Views de Tendências e Benchmarks**<br>- Views focadas em tempo e grupo: `vw_behavioral_trends`, `vw_objection_trends`, `vw_product_trends`, `vw_sentiment_trends`, `vw_vendor_benchmarks`, `vw_store_comparison`, `vw_checklist_conversion`, `vw_technique_success`, `vw_objection_efficacy`. | IA (Antigravity) | T3.1 | Sazonalidade efetiva. Tabelas capazes de gerar relatórios de agrupamento de até 4 semanas sem falhas. |
| **T3.3** | **Refatorar Módulo r_qa_heatmap.js**<br>- Extrair a consulta JSONB obsoleta em prol das queries geradas em `vw_checklist_summary`. | IA (Antigravity) | T3.1 | Renderização visual gráfica com 100% de paridade com o design front-end da v1. |
| **T3.4** | **Refatorar Módulos de Vendas, Oportunidades e Atrito**<br>- Substituir lógicas dos arquivos `r_vendas.js`, `r_oportunidades.js`, `r_atrito.js`. | IA (Antigravity) | T3.1 | Identidade na renderização gráfica com incorporação dos novos recursos v5 (`realistically_addressable` presente/ROI). |
| **T3.5** | **Refatorar Módulos NLP, Comportamento e Predição**<br>- Otimizar `r_nlp.js`, `r_comportamento.js`, `r_intencao_preditivo.js` por queries. | IA (Antigravity) | T3.2 | Resgatar dados rigorosos das saídas analíticas do Schema 7.1. Gráficos de tendências no tempo rodando visíveis. |
| **T3.6** | **Refatorar Módulos de Fala e Compliance/Follow-Up**<br>- Transformar `r_falantes_fases.js`, `r_compliance_followup.js`. | IA (Antigravity) | T3.1 | Indicadores visíveis de Ratio de falas e flags de `compliance_alerts` gerados pelo A7. |
| **T3.7** | **Implementar Dashboard de Benchmarking**<br>- Ranking por vendedor e visão temporal com suporte a outliers e evidências correlativas de vendas. | IA (Antigravity) | T3.2 | Lista ranqueada real com filtros baseados na RLS do Vendedor ou Gerente. |
| **T3.8** | **Dashboard/Transcrição Interativa**<br>- Destaque de `entidades` no visualizador, possibilidade de marcação com a *flag* `edited=true` sobre o que for modificado via interface no frontend. Player sincronizado. | IA (Antigravity) | T3.1 | As fases são exibíveis nas demarcações de player do áudio e entidades aparecem visualmente indicadas. |
| **T3.9** | **Módulo de Relatórios de Exportação**<br>- Criação de CSS nativo para PDF e gatilhos de relatório para envio em rotinas CRON agendadas por email. | IA (Antigravity) | T3.7 | Tempo de compilação PDF via print ou puppeteer <5s, CRON de email gerado via serverless/edge. |
| **T3.10**| **Validar os 5 Perfis Funcionais (RLS e Auth)**<br>- Reforço final limitando todo o dashboard as visualizações exclusivas do (1) Administrador (2) Diretor Regional (3) Gerente Loja (4) Vendedor (5) Auditor Externo/Cliente Oculto. | IA (Antigravity) | T3.7 | Auditor e Vendedor veem exclusivamente interações proprietárias. Gerente e Diretores filtram suas restritas zonas. |

---
*Este documento é parte do refatoramento arquitetural v5.0 (Local-First). Nenhuma alteração arquitetural deve ser feita sem aprovação prévia baseada nestas regras.*
