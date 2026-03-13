# FASE 1 (novoplano_integrado) — Evolução da Fundação: Ontologia, Schema e Extratores

**Duração estimada:** ~2 semanas

## Visão Geral
Esta fase incorpora as robustezes do planejamento v5.0 diretamente na fundação já consolidada do projeto v0. Em vez de descartar a base, vamos adicionar tabelas, refinar as ontologias e garantir que as extrações determinísticas pré-agentes estejam alinhadas à nova arquitetura (E1/E2). A etapa de análise acústica local com base em `librosa` ou `WebRTC VAD` foi expressamente descartada, mantendo o ambiente sem sobrecarga local.

## Tarefas Detalhadas

| ID | Tarefa | Executor | Depende de | Critério de Aceitação |
|---|---|---|---|---|
| **T1.1** | **Revisar e completar checklist_zeiss_v6.json**<br>- 22 itens com suas respectivas keywords, pesos, flag `requires_llm` e transcrições de exemplo reais. | MANUAL | — | 0 falsos positivos em 5 transcrições reais. O checklist v6 servirá como ontologia principal. |
| **T1.2** | **Criar product_catalog.json**<br>- Cadastro de produtos, variações linguísticas, hierarquia, margem de lucro (`margin`) e `scripts[]`. | MANUAL | — | Catálogo preenchido com ≥3 variações e métricas da loja. |
| **T1.3** | **Criar objection_taxonomy.json**<br>- Base tipificada de 9 objeções canônicas com definições e diretrizes de contorno. | MANUAL | — | 9 tipos de objeção categorizados e documentados. |
| **T1.4** | **Script SQL Evolutivo das Novas Tabelas**<br>- Adicionar as 30 tabelas (pipeline e complementares) à base atual, **sem quebrar tabelas antigas**.<br>- Aplicar Roles (RLS) granulares: Admin, Regional, Loja, Vendedor, Auditor. | IA (Antigravity) | T1.1 - T1.3 | Script testado. RLS e escopos limitando ativamente o acesso de acordo com o JWT do Supabase. |
| *(Descartada)* | *Módulo de Pré-Processamento de Áudio Local...* | — | — | *Descartado conforme instrução do usuário de "não rodar nada localmente".* |
| **T1.6** | **Evoluir `parser.js` do v0 para capturar flags**<br>- Adaptação do script já existente para retornar um formal `confidence_score` e `manual_review` a partir dos falantes identificados nas transcrições do Whisper. | IA (Antigravity) | T1.4 | Score devolvido como metadados integrados às respostas dos requests. |
| **T1.7** | **Aprimorar o `extractor.js` / E2 Existente**<br>- Injetar no fluxo do backend o Gap Analysis e o Checklist Determinístico (15 itens), usando Regex/Dicionários no Python antes dos repasses aos LLMs. | IA (Antigravity) | T1.6 | Mapeamento de Extração Determinística efetuado e registrado antes da bateria de agentes. |
| **T1.8** | **Testes de Integração com Áudios Reais**<br>- Rodar e certificar o parseamento usando amostras para afirmar a integridade contínua do pipeline existente com novos coletores. | MANUAL + IA | T1.7 | Sucesso do novo E2 processando textos gerados pelo baseline (v0). |
