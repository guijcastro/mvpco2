# FASE 5 (novoplano_integrado) — Inteligência Avançada (Construtores e Previsões Locais)

**Diferenciação B2B Isolada** · **Duração estimada:** ~2 semanas

## Visão Geral
*Nota: Atendendo a solicitação expressa, todo e qualquer contato com sistemas externos de CRM ou ERP (Pontos de Venda reais) foi removido do escopo do projeto e os agentes não considerarão requisições dessas instâncias.*

A Fase 5 agora lida unicamente com lógicas intra-muros da aplicação. Ela empodera administradores por meio de construtores visuais das métricas preditivas (Churn Local) restritas aos atendimentos do próprio histórico do sistema.

## Tarefas Detalhadas

| ID | Tarefa | Executor | Depende de | Critério de Aceitação |
|---|---|---|---|---|
| **T5.1** | **Construtor de Checklist Customizáveis**<br>- Editor paramétrico do `checklist_zeiss_v6.json` onde os weights, requires_llm e keywords podem ser customizados diretamente na instância, afetando a avaliação da filial na extração E2. | IA (Antigravity) | T3.10| Configuração visual de UI salva métricas refletindo imediatamente orquestração da pipeline no A1. |
| **T5.2** | **Cálculo Progressivo Histórico Interno**<br>- Projetos analíticos autônomos por modelo SQL de repetição nativa: Conversas que se sucedem de um mesmo `client_name` formam projeções para prever janelas lógicas de "Follow-ups Recomendados" usando matemática relacional. | IA (Antigravity) | T3.2 | Histórico de ≥5 interações passadas resulta numa estimativa relacional de progressão autônoma de frontend. |
| **T5.3** | **Criador Prático de Prompts (Studio Local)**<br>- Playground configurado offline testando os comportamentos do LLM com estritos JSON-schemas implementados, validando a coerência na hora de gerar melhorias isoladas e controladas na IA. | IA (Antigravity) | Fase 2 | Edição de templates base ocorrendo visualmente sem quebrar e testável localmente em `sandbox`. |
| **T5.4** | **Rotinas Condicionais de Análise (Database Triggers)**<br>- Definição de eventos condicionais da plataforma permitindo que painéis executem por lote à noite (CRON) mitigando estrangulamento da API por disparo das atendentes em horários de pico comercial. | IA (Antigravity) | T5.3 | Regras assíncronas de fomento programacional funcionais para economia e distribuição de chamadas NLP. |
| **T5.7** | **Notificações e Alertas**<br>- Threshold triggers e webhooks puramente internos usando o Supabase para disparos via Email/SMS dependendo estritamente do próprio Supabase/Edge quando as métricas violarem restrições internas configuráveis. | IA (Antigravity) | T3.10| Sistema notifica as regionais sobre condutas fora do baseline imediatamente. |
| **T5.8** | **CRUD Web do Catálogo Base (Gestão de Portfólio)**<br>- Ferramenta autônoma via Painel de Controle provendo edição estática dos produtos do banco `product_catalog.json` local retro-alimetando gaps lógicos da própria plataforma. Sem uso de PDV externo. | IA (Antigravity) | T3.10| Gap local passa a ler tabelas dinâmicas customizadas de admin. |
| **T5.9** | **Sistema Interativo de Quizzes Customizados**<br>- Quiz baseado nas próprias anotações registradas nos Gaps da IA para alimentar perguntas estáticas cobrando sobre itens falhados de vendas perdidas do colaborador. | IA (Antigravity) | T4.2 | 5 Perguntas originadas a partir de dados da filial evidenciando oportunidade de treinamento autônomo e isolado. |
| **T5.10**| **Aprofundamento Visual Executivo**<br>- Renderizações gráficas ricas implementando filtros regionais em todas suas extensões gerando planilhas fáceis e consolidadas visando o público tático. | IA (Antigravity) | T3.7 | Impressão interativa relacional 100% suportada a nível admin com gráficos do repositório relacional SQL. |

---
*Este documento é parte do refatoramento arquitetural v5.0 (Variação Mantendo Base Legacy 100% e Cortando Integrações).*
