# FASE 6 (novoplano_integrado) — Ecossistema e Segurança Limitadores

**Multi-Loja Sem Acoplamentos B2B de Parceiros** · **Duração estimada:** ~3 semanas

## Visão Geral
Sistematiza o produto para sua validação em macro-escala sem requistar a infraestrutura da loja matriz (Cortando conexões reais, ERP ou PDVs). Expande a privacidade, restringe logins na base JWT a Multi-Lojas usando Row Level Security garantindo proteção LGPD e permitindo relatórios em tempo em nível operacional próprio.

## Tarefas Detalhadas

| ID | Tarefa | Executor | Depende de | Critério de Aceitação |
|---|---|---|---|---|
| **T6.1** | **Suportes Hierárquicos (RLS DB Granular)**<br>- Mapeamento hierárquico isolante Região > Cidade > Loja > Vendedor. Garante proteção rígida em instâncias no Supabase onde o JWT do Vendedor ou da Gerência inabilita as tabelas superiores evitando vazamentos entre instâncias Multi-tenant. | IA (Antigravity) | Fase 5 | Testes de acesso confirmando barreira Row Level Security. Dispara Warning / Error na violação deliberada com Credencial Básica. |
| **T6.2** | **Rotas Restritivas e Exportação Limitada Backend**<br>- Parametrização robusta do FastApi controlando número de chamadas (Rate Limits API Interna) limitando gargalos e estabilizando a ingestão de múltiplos processadores. | IA (Antigravity) | T6.1 | Funcional sem overhead via POST, evitando crash e loops de consultas exarcebadas locais no front. |
| **T6.3** | **Rankeamentos Autômatos Locais Gamificados**<br>- Tabelamentos dedicados isolados em banco para somatório numérico criando engajamento das Equipes a nível competitivo limpo a partir do pipeline gerado em T3, estimulando uso autônomo e local. | IA (Antigravity) | Fase 3 | Gatilhos de database injetando marcos percentuais nos Vendedores para instigar concorrência. |
| **T6.4** | **Importação Modular Básica de Cenários (Setup)**<br>- Subida passiva num upload interno de configurações para administradores variarem o comportamento do ambiente (Trocar persona / Peso) carregando templates customizados sem código. | IA (Antigravity) | Fase 5 | Interface com upload funcional isolado que recarrega comportamento JSON de base. |
| **T6.5** | **Camadas Estritas de Anonimização (LGPD / Privacy)**<br>- Remoção nativa num compilador string ou string replace (mascaramento) garantindo que nenhum LLM salve localmente no Supabase os CNPJs Reais, Cartões ou Registros do consumidor. Deleção programada em x meses garantida. | IA (Antigravity) | T6.1 | String do cliente re-convertido em "[DADOS_CONFIDENCIAIS]" gerando total conformidade. Retenção ativa limpadora via Cloud trigger cron no banco. |
| **T6.6** | **Geradores Visuais Estáticos do Board**<br>- Configuração do render em Widgets e acoplamento a scripts emissores estáticos da aplicação salvando os gráficos visualizáveis num modo fácil de download ou impressão em blocos PDF fixos. | IA (Antigravity) | Fase 5 | Impressor local rodando com estabilidade permitindo snapshots imediatos. |

---
*Este documento é parte do refatoramento arquitetural v5.0 (Variação Mantendo Base Legacy 100% e Cortando Integrações).*
