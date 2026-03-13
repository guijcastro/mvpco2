# FASE 2 (novoplano_integrado) — Evolução e Paralelismo de Agentes de Classificação

**Expansão da Engine Analítica** · **Duração estimada:** ~4 semanas

## Visão Geral
Em vez de desconstruir o `/classify` legado, as regras de paralelismo e restrição de contexto do novo V5 são fundidas harmoniosamente aos 7 agentes pioneiros. O script orquestral despachará requisições simultâneas para otimizar velocidade, mantendo total proteção às chamadas. Integrações de CRM foram expurgadas, mantendo a autonomia total e os agentes não preverão parâmetros de clientes reais além dos falados em áudio explícito. O Agente A9 entra isoladamente gerando embeddings (matrizes) autônomas úteis na Fase 4.

## Tarefas Detalhadas

| ID | Tarefa | Executor | Depende de | Critério de Aceitação |
|---|---|---|---|---|
| **T2.1** | **Orquestrar Janelas no Backend (/analyze-v2)**<br>- Controla execuções paralelas de Agentes em blocos para reduzir latência (async), atuando num novo endpoint lado a lado com o método da Fase 1, blindando em fallback qualquer falha da máquina. | IA (Antigravity) | Fase 1 | Paralelismo async viabilizando ganho forte de processamento total por chamada. |
| **T2.2** | **Aprimorar A1 (Checklist Ambíguo)**<br>- Refina contexto e regras do LLM: blinda 7 itens com enumeradores firmes do pydantic no python e foca em re-checagem ativa caso a IA gere strings imprevistas. | IA (Antigravity) | T2.1 | Tolerância zero à distorções de JSON; o A1 se autocorrigirá nativamente. |
| **T2.3** | **Aprimorar A2 (Objeções)**<br>- Blinda a taxonomia de 9 objeções avaliando quão concisa a desconstrução técnica do vendedor se provou a favor do fechamento. | IA (Antigravity) | T2.1 | Pre-filtros de turnos mantendo escopo. Validadores pydantic estritos para taxonomia. |
| **T2.4** | **Aprimorar A4 (Heatmap Sentimental / Emoções)**<br>- Segmenta individualmente como a intenção foi se esfacelando ou elevando baseados nas subdivisões já preexistentes da conversa (N Fases gerando N Sentimentos). | IA (Antigravity) | T2.1 | Coerência sentimental temporal preenchida restrita à transcrição local. |
| **T2.5** | **Aprimorar A5 (Perfil Psicológico)**<br>- Analisa o arquétipo e preenchimentos demográficos (exclusivamente com evidências capturadas no contexto temporal) marcando a tag *is_inferred*. Sem uso de chaves históricas de CRM. | IA (Antigravity) | T2.1 | Proteção autônoma. Nenhuma invenção por parte de agentes é tolerada de cadastros virtuais; todos inferidos pelas falas locais explicitas. |
| **T2.6** | **Aprimorar A3 (Intenção de Compra via CoT)**<br>- Restringir lógicas quantitativas. A máquina processará vetores (Score) pontuados sobre a rigidez das matrizes de engajamento, objeção, e fechamento prático para firmar o Intent-Score. | IA (Antigravity) | T2.3 | Relato base estruturado atestando base analítica robusta de onde a IA tirou as evidências do seu SCORE. |
| **T2.7** | **Aprimorar A6 (Oportunidades Perdidas)**<br>- Executa GAPs com *Set-Difference* limpos, extraindo necessidades numéricas determinísticas pelo Python nativo em vez de perguntar números crus aos LLMs imprecisos. | IA (Antigravity) | T2.5 | Cálculo blindado nativamente (Determinístico) sobre sugestão de up-sell acionável puramente sobre a base local não-integrada. |
| **T2.8** | **Aprimorar A7 (Síntese Narrativa)**<br>- Consolidação sumarizada final captando estado final de todos os Agentes anteriores para redigir o parágrafo de fechamento gerencial isento da leitura suja do documento de turnos integramente transcritos. | IA (Antigravity) | T2.2 a T2.7 | Estruturação sumária concisa e direta validada restritamente no ecossistema já analisado. |
| **T2.9** | **Integrar API de Embeddings (A9 base)**<br>- Instâncias simples convertidas num banco `pgvector` Supabase via representação vetorial compacta para futuras simulações, operando com API modelo aberta compatível para fins exclusivos das matrizes orgânicas. | IA (Antigravity) | T2.8 | Vector Database ativado populando metadados nativos com as saídas geradas. |
| **T2.10**| **Armazenamento de Vector Exemplares**<br>- Somente guardará sessões que representem arquétipos formidáveis visando o motor de simulações base, filtrado com Score Qualificado de Compra > 80 na intenção pré-marcada pelo A3. | IA (Antigravity) | T2.9 | Prevenção de "Ruídos" lógicos e salvamento vetorial excessivo no servidor limitando gravação e gasto computacional da Cloud. |
| **T2.11**| **Monitoramento Analítico Extendido**<br>- Painel de Latência e Tolerância reescrevendo custo exato da orquestração dos novos recursos modulares. | IA (Antigravity) | T2 | Monitoramento persistente transparente sob telemetrias. |
| **T2.12**| **Testes Simultâneos**<br>- O endpoint novo e o endpoint legado poderão ser checados simultaneamente testando as divergências num clique botão no Painel sem anular nenhum endpoint antigo fundacional. | IA (Antigravity) | T2.11| Endpoint mantido a salvo 100%. |

---
*Este documento é parte do refatoramento arquitetural v5.0 (Variação Mantendo Base Legacy 100% e Cortando Integrações).*
