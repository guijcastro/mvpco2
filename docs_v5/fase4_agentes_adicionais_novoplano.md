# FASE 4 (novoplano_integrado) — Agentes Adicionais (Simulador, Biblioteca e Rastreabilidade)

**Duração estimada:** ~3 semanas

## Visão Geral
Adiciona os Agentes 8 e 9 (criados no v5.0) para estender a inteligência do projeto com Treinamento Autônomo e Buscas Semânticas. A análise puramente acústica (pitch, pausas com extração baseada na variação de áudio cru) foi **descartada** em concordância com a premissa de não escalar dependências locais massivas.

## Tarefas Detalhadas

| ID | Tarefa | Executor | Depende de | Critério de Aceitação |
|---|---|---|---|---|
| **T4.1** | **Endpoint de Busca Semântica (/search-practices)**<br>- Integra as queries do Agente 9 com a base `pgvector` do Supabase para efetivar Similaridade de Cosseno sobre as conversas. | IA (Antigravity) | Fase 2 | Retorno <1s sobre o dataset mantendo RLS respectivo. |
| **T4.2** | **Front-End da Biblioteca de Melhores Práticas**<br>- Adicionar UI extra ao projeto v0 listando "Práticas Campeãs" com tocador e texto resumido das abordagens. | IA (Antigravity) | T4.1 | UI acessível e filtrável pelas `skill_tags` gravadas pelos embeddings. |
| **T4.3** | **Dashboards Relacionais de Eficácia**<br>- Consultas nativas (SQL puro) correlacionando Agente 2 (Objeções) com encerramento nominal de metas (`sales_completed`). | IA (Antigravity) | Fase 3 | Rankings funcionais das respostas textuais que mais revertem *No* em *Yes*. |
| **T4.4** | **Motor do Simulador Persona A8 (Backend)**<br>- Nova branch LLM dedicada a gerenciar sessões interativas textuais/audio emulação. O LLM personificará perfis do Agente 5 atuando como clientes problemáticos em tempo real. | IA (Antigravity) | Fase 2 | Sessões estáveis; o LLM segura o arquétipo predeterminado ao longo de diversos turnos sem quebrar o contexto. |
| **T4.5** | **UI Interativa do Simulador de Loja**<br>- Tela focada em treinamento no Dashboard que emula chat em tempo real alimentando o A8. Interface emite feedbacks e correção ao colaborador treinado. | IA (Antigravity) | T4.4 | Registros de notas e evolução salvos adequadamente em `simulation_sessions`. |
| *(Descartada)*| *Motor Audio Analítico Prosódico (Features Acústicas)* | — | — | *Rotina com `librosa` removida conforme diretriz do usuário (Nenhuma execução local).* |
| **T4.7** | **Anotações Direcionadas por Trecho (Review)**<br>- Links acionáveis nos players e transcritores (`?t=SECONDS`) ligando anotações temporais com repasse do ponteiro no front. | IA (Antigravity) | Fase 3 | Anotações renderizando corretamente no frame exato da transcrição áudio/texto para fins de treinamento e auditoria. |
