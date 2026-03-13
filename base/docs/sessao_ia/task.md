# Task Breakdown: Sistema Avançado de Telemetria

### Fase 1: Banco de Dados
- [x] Criar e executar script SQL no Supabase para tabela `usage_telemetry` com campo `estimated_cost_usd`
- [x] Configurar RLS (Row Level Security) para a nova tabela

### Fase 2: Instrumentação no Backend (`bun_server.js`)
- [x] Adicionar arquivo customizável `pricing.json` lido pelo backend (com valores default)
- [x] Adicionar medição de latência ponta a ponta (`performance.now()`)
- [x] Extrair tokens de Prompt e Completion (OpenAI e Gemini)
- [x] Calcular algoritmo de custo estimado com base no dicionário e registrar valor em US$.
- [x] Registrar operações de "chat" com telemetria e custo
- [x] Registrar operações de "transcription" com telemetria e custo
- [x] Ajustar payload de resposta para incluir o objeto `telemetry`

### Fase 3: Monitoramento em Tempo Real (`chat.html`)
- [x] Adicionar componente de UI (Heads-Up Display) para Telemetria no Chat
- [x] Atualizar o HUD dinamicamente a cada resposta recebida
- [x] Incluir animações ou marcadores visuais para melhor UX

### Fase 4: Dashboard Corporativo (`relatorio.html`)
- [x] Criar página `relatorio.html` baseada em Vanilla JS + Tailwind.
- [x] Construir 4 mini-cards KPIs (Volume Tokens, Custo Total, Average Latency, Req Count).
- [x] Construir Tabela detalhada consumindo o banco via client Supabase restrito.
- [x] Adicionar biblioteca Chart.js.
- [x] Exibir gráfico de Evolução Temporal (Tokens x Dias).
- [x] Exibir gráfico de Pizza com Custo Acumulado quebrado por Modelo de IA.

### Fase 5: Dashboard de Chat Ativo (`chat.html`)
- [x] Criar painel lateral ou superior para estatísticas da conversa atual (Sessão Ativa).
- [x] Implementar script agregador local (variáveis de sessão) que ouve o HUD.
- [x] Renderizar mini-cards em tempo real (Total Gasto na Conversa, Tokens Totais na Conversa, Média de Latência na Conversa).

### Fase 6: Parametrização Dinâmica de Preços (`settings.html`)
- [x] Criar `/functions/pricing` no `bun_server.js` (GET/POST) para ler e atualizar `pricing.json`
- [x] Adicionar UI em `settings.html` para listar modelos e inputs/outputs US$
- [x] Conectar formulário ao backend com validação de dados decimais

### Fase 7: Rastreamento Global (Servidor Local)
- [x] Atualizar script Supabase `telemetry_setup.sql` (`server_processing_ms`, `server_cost_usd`)
- [x] Atualizar backend para colher tempo global e derivar o `server_cost` no JSON paramétrico 
- [x] Renderizar uso e custo do servidor no HUD e nos Cards laterais
- [x] Atualizar UI de settings para gerenciar a variável do "Servidor"
- [x] Propagar novos campos na renderização da Tabela no `.html` do Relatório
- [x] Separar visualmente o Custo de Tokens vs Custo de Processamento no Relatório

### Fase 8: Múltiplos Modelos de Transcrição
- [x] Adicionar dropdown seletor de Modelo de Transcrição (OpenAI / Gemini) em `dashboard.html`
- [x] Ajustar rotina de fetch de API Keys no cliente baseado no modelo escolhido
- [x] Atualizar endpoint `/functions/transcribe` no backend para aceitar `provider` e `modelId`
- [x] Integrar a API Whisper (`whisper-1`) da OpenAI no backend, passando Buffer de Áudio
- [x] Atualizar a lógica de envio de Telemetria de transcrição para lidar com precificação por minuto do Whisper

### Fase 9: Filtros do Relatório Corporativo
- [x] Criar barra de filtros (Data, Modelo, Atividade) na UI de `relatorio.html`
- [x] Popular magicamente as opções de "Modelo" e "Atividade" baseado nos dados existentes.
- [x] Implementar a lógica de recálculo (client-side) para atualizar KPIs, Gráficos e Tabela com base nos filtros selecionados.
- [x] Implementar sistema de Exportação do Relatório em HTML (com data/hora precisa e styling independente).

### Fase 10: Chat Avançado & Exportação
- [x] Criar área UI em `chat.html` para o usuário definir o Prompt do Sistema / Persona Inicial.
- [x] Interceptar o envio para injetar o custom prompt na matriz `conversationHistory` em vez do template hardcoded.
- [x] Criar dropdown/botões de exportação (TXT, JSON, CSV).
- [x] Implementar lógicas client-side de parser e Blob download para o Histórico de Chat.

### Fase 11: Classificação Automática de Áudios
- [x] Criar e executar `classification_setup.sql` no Supabase para criar a nova tabela segura `audio_classifications`.
- [x] Desenvolver endpoint `/functions/classify` no `bun_server.js` com integração JSON-mode nas APIs (OpenAI/Gemini).
- [x] Atrelar logging financeiro e token-tracking em `/functions/classify` para a tabela de `usage_telemetry`.
- [x] Criar UI Modal no `dashboard.html` para permitir o usuário ditar os parâmetros e extrair o JSON validado.

### Fase 12: Dashboard BI de Inteligência de Negócios (Classificações)
- [x] Criar a página `bi.html` com layout Tailwind (estendendo o design do `relatorio.html`).
- [x] Implementar a query Supabase que puxa a tabela `audio_classifications`.
- [x] Desenvolver parser em JavaScript para extrair KPIs fixos do Schema JSON proposto (Conversão, Eficiência, Objeções).
- [x] Instanciar gráficos com Chart.js.
- [x] Adicionar links de navegação cruzada na Navbar principal do sistema conectando a este novo BI.
- [x] Renderizar graficamente o JSON de saída para o usuário final, com opção de salvar/exportar a análise.

### Fase 13: Arquitetura de 40 Relatórios Isolados (Granularidade Máxima)
- [x] Criar e instruir a execução do script `store_setup.sql` adicionando a coluna `store_id` aos áudios existentes.
- [x] Modificar o `upload.html` adicionando o campo de envio "Loja" atrelado ao banco de dados.
- [x] Deletar o antigo `bi.html` consolidado.
- [x] Construir motor `relatorio_dinamico.html` (com sidebar de 40 links gerados a partir do schema oficial).
- [x] Tratar layout, gráfico e português dedicado para as métricas de Vendas (Taxas, Ticket, Timing).
- [x] Tratar layout, gráfico e português dedicado para as métricas de Oportunidades Perdidas e Produtos.
- [x] Tratar layout, gráfico e português dedicado para o Perfil do Consumidor, NLP e Sentimento.
- [x] Tratar layout, gráfico e português dedicado para Objeções, Concorrência e Críticas Veladas.
- [x] Tratar layout e português dedicado para Checklist de Qualidade e Compliance.
- [x] Atualizar navbar de todas as telas públicas substituindo "BI" por "Relatórios Detalhados".
