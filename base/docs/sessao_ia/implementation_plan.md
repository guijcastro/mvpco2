# Arquitetura Avançada de Telemetria e Fluxo Informacional

Conforme solicitado, desenhamos uma solução sofisticada para medição de fluxo informacional, focada em observabilidade técnica, controle de custos operacionais e performance. 

O sistema atuará em três camadas distintas: **Persistência Perene (Supabase)**, **Coleta em Borda (Bun Server)** e **Consciência Situacional (Front-end UI)**.

## 1. Persistência e Estrutura de Dados (Supabase)

Para viabilizar este nível de controle, criaremos uma tabela analítica dedicada. Como você gerencia o Supabase manualmente, eu fornecerei o script SQL exato.

### A Tabela: `usage_telemetry`
Será projetada para suportar alta carga de inserções sem comprometer os joins futuros no relatório.

**Campos principais:**
- `id`: UUID (Primary Key)
- `user_id`: Referência do usuário autenticado no sistema (segurança RLS).
- `operation_type`: `VARCHAR` (ex: `chat`, `transcription`, `analysis`).
- `provider`: `VARCHAR` (`openai` ou `gemini`).
- `model`: `VARCHAR` (ex: `gpt-4o`, `gemini-2.0-flash`).
- `prompt_tokens`: O volume de tokens do contexto (enviado).
- `completion_tokens`: O volume de tokens da resposta (processado/gerado).
- `total_tokens`: Total faturável da operação.
- `estimated_cost_usd`: `DECIMAL(10,6)` (Cálculo preciso do custo da requisição na IA em Dólares).
- `latency_ms`: Tempo total da transação ponta-a-ponta na IA.
- `server_processing_ms`: Tempo em milissegundos que o servidor local levou para processar inteiramente o request (descontando o tempo ocioso aguardando a IA).
- `server_cost_usd`: `DECIMAL(10,6)` (Cálculo paramétrico do custo computacional do servidor por requisição/tempo).
- `created_at`: Timestamp com timezone.

> [!IMPORTANT]  
> Você precisará rodar um NOVO script SQL no seu painel do Supabase (`telemetry_setup.sql`) para adicionar as novas colunas de processamento do servidor.

## 2. Coleta de Metadados na Borda (Bun Server)

A filosofia arquitetônica aqui é não onerar a percepção de resposta ao usuário final.

### [MODIFY] `bun_server.js`
- **Registro do Esforço do Servidor:** O servidor iniciará um cronômetro global via `performance.now()` assim que o hit bater no endpoint, e finalizará no retorno da `Response`. O `server_processing_ms` será o tempo total, menos a latência gasta aguardando as respostas externas da rede (OpenAI/Google).
- **Algoritmo Orçamentário Estendido:** O arquivo `pricing.json` agora contemplará também um bloco `"server"`, com os custos de processamento base ("por requisição" e/ou "por milissegundo").
- **Precificação por Inferência:** Após colher a volumetria, o backend rodará a função `(prompt * input_price / 1000000) + (completion * output_price / 1000000)` para gerar o valor flutuante exato (`estimated_cost_usd`) da requisição da IA. Também rodará o cálculo paralelo para gerar o valor do `server_cost_usd`.
- **Extração de Tokens:**
  - Na **OpenAI**, consumiremos `completion.usage` (`prompt_tokens`, `completion_tokens`).
  - No **Gemini**, consumiremos `result.response.usageMetadata` (`promptTokenCount`, `candidatesTokenCount`).
- **Respostas Aprimoradas:** O payload trará: `{ telemetry: { ...  serverProcessingMs: X, serverCostUsd: Y } }`.

## 3. Consciência Situacional em Tempo Real (Chat UI)

### [MODIFY] `public/chat.html`
- Inclusão de um **Heads-Up Display (HUD) de Telemetria** sob o input do chat ou em uma barra sutil fixada na tela.
- Ao ocorrer uma chamada, a interface ficará em estado "Medindo...". Ao receber o payload, os dados piscarão em tempo real atualizando:
  - ⏱ Latência (ms)
  - ⬆️ Tokens Enviados
  - ⬇️ Tokens Recebidos
  - 💰 Custo Estimado (US$)
  - ⚙️ Servidor
- **Logging Automático:** Assim que os dados chegarem à interface, o cliente invocará um `insert` para a tabela `usage_telemetry` usando a sessão segura.

### Agregação da Sessão Ativa e HUD (Dashboard em Tempo Real do Chat)
- No **HUD unitário**, além do custo e tempo da IA, adicionaremos pílulas indicando `server_ms` e `server_$`.
- No **Dashboard Estático/Lateral**, os mini-cards acumularão também os custos totais integrando o consumo de rede + consumo no BunJS.

### Configuração de Custos da IA e do Servidor (Settings)
- Na tela `settings.html`, o painel "Tabela de Custos (US$)" suportará também a exibição e alteração da matriz de uso de CPU do Server local, enviando ao PUT/POST do Backend.

## 4. Dashboard Analítico (Relatório Geral)

### [NEW] `public/relatorio.html` (Relatório de Consumo)
Criaremos um dashboard específico para auditoria avançada focado no "C-Level" ou administrador do sistema.
- Consumirá dados agregados da tabela `usage_telemetry`.
- Apresentará **Gráficos** (utilizando Chart.js):
  - *Volume de Tokens por Dia* (Visão Geral).
  - *Latência Média por Provedor* (Comparativo de eficiência entre OpenAI e Gemini).
  - *Custo Acumulado (TCO)* (Gráfico de pizza mostrando gastos agregados e reais em dólares por IA).
  - *Lista Detalhada de Operações* (Table Grid com paginação dos últimos logs).
- Terá um link para fácil acesso na barra de navegação superior (junto a Dashboard e Configurações).

## 5. Roteamento de Modelos de Transcrição (Whisper e Gemini)

### [MODIFY] `public/dashboard.html`
- Inclusão de um dropdown de seleção ("Modelo de Transcrição") no topo da tabela ou ao lado do botão de enviar.
- Modificação na função `transcribe()` para capturar o modelo selecionado (ex: `openai|whisper-1` ou `gemini|gemini-2.0-flash`).
- A lógica buscará a chave de API correspondente (`openai_key` ou `gemini_key`) na tabela `user_settings`.

### [MODIFY] `bun_server.js`
- Atualização do endpoint `/functions/transcribe` para aceitar `provider` e `modelId` no JSON body.
- Implementação da API de Áudio da OpenAI (Whisper):
  - Download do buffer de áudio e conversão para o formato `File` nativamente suportado pela biblioteca da OpenAI.
  - Solicitação da transcrição usando `response_format: "verbose_json"` para obter a duração do áudio em segundos.
- Atualização da precificação: Inclusão de um cálculo de custo baseado na `duration` (segundos) multiplicada pelo custo do `whisper-1` (ex: $0.006 por minuto), ou fallback para custo baseado em tokens no caso do Gemini.

## 6. Filtros Avançados no Relatório (Dashboard)

### [MODIFY] `public/relatorio.html`
- **UI:** Adição de uma barra lateral (ou barra superior abaixo dos KPIs) contendo 3 selects/inputs:
  - `Período` (Últimos 7 dias, Últimos 30 dias, Todos).
  - `Modelo de IA` (Todos, GPT-4o, Gemini Flash, Whisper, etc).
  - `Tipo de Atividade` (Todas, Chat, Transcrição).
- **Lógica (JS):** A função `loadTelemetryData()` vai baixar o raw data (ou expandir o limit atual) e aplicar um `#filter()` no array de dados *antes* de rodar a agregação dos KPIs e Tabelas, permitindo fatiar o dataset em tempo real.

## 7. Chat Avançado & Exportação

### [MODIFY] `public/chat.html`
- **Chat Avançado (Custom Prompt):** Adicionar um `<textarea>` expansível na interface (possivelmente sob o player de áudio ou acima do histórico) onde o usuário pode definir as **Instruções de Sistema** (Persona) antes da primeira mensagem. Substituir o prompt hardcoded de "Cliente Oculto" pelo valor desta textarea.
- **Exportação:** Adicionar um menu ou botões de `Exportar Histórico` (TXT, CSV, JSON) que varre o array in-memory `conversationHistory` e converte as mensagens trocadas no formato desejado, forçando o download `Blob` imediato.

## 8. Classificação Automática de Áudio (JSON)

### [NEW] `classification_setup.sql`
- Script SQL para criar a tabela `audio_classifications` (sem dropar nada do ecossistema atual).
- **Campos:** `id`, `audio_id` (FK para `audio_files`), `user_id` (FK), `classification_data` (JSONB), `model_used` (Text), `created_at`.
- Habilitar RLS e criar políticas de Select/Insert/Update para o usuário autenticado.

## 9. Business Intelligence (BI) Dashboard das Classificações

### [NEW] `public/bi.html`
- **Filtros Globais:** Múltiplos `<select>` preenchidos dinamicamente baseados nas chaves detectadas nos JSONs salvos (ex: Data, Modelo IA, Loja, Vendedor, Missão).
- **Indicadores Principais (KPIs):** Cards no topo mostrando a média de `efficiency_score`, total de vendas concluídas, `total_score` médio do checklist e soma de `total_estimated_value_loss` (oportunidades perdidas).
- **Gráficos (Chart.js):** 
  - Gráfico de Rosca ou Barra para "Vendas Concluídas vs Perdidas".
  - Gráfico de Linha para evolução temporal do `efficiency_score`.
  - Gráfico de Barras horizontais para "Principais Objeções Encontradas".
  - Gráfico de Radar (opcional) consolidando o `customer_profile`.
- **Lógica Central Client-Side:** Um script forte em JS que baixa todo o array da `audio_classifications` do usuário, aplica os filtros no front-end em tempo real, varre a estrutura do objeto JSON predefinida e recalcula as métricas para injetar no Chart.js.
- **Menu Integrado:** Adicionar link para este novo painel na Navbar de todos os HTMLs (`dashboard.html`, `relatorio.html`, `settings.html`, e no próprio `bi.html`).

### [MODIFY] `bun_server.js`
- Criar novo endpoint `POST /.netlify/functions/classify` que:
  - Recebe `audioId`, `provider`, `modelId`, e um `systemPrompt` (com os parâmetros de classificação).
  - Busca a transcrição salva no banco para aquele `audioId`.
  - Envia para a OpenAI ou Gemini forçando o modo de resposta `response_format: { type: "json_object" }` (se suportado) ou via prompt engeneering estrito.
  - Grava o JSON resultante na nova tabela `audio_classifications`.
  - Registra o uso financeiro/tokens na tabela `usage_telemetry` com a `operation_type: 'classification'`.

### [MODIFY] Frontend UI (`dashboard.html` / `analise.html`)
- Inserir um botão de "Classificar" ao lado de "Chat" ou "Transcrever" para os áudios que já possuem transcrição.
- Criar um modal ou área no front-end para o usuário preencher o prompt de classificação (ex: os parâmetros de Cliente Oculto que ele quer extrair).
- Exibir os resultados JSON na tela de forma visualmente agradável (ex: cards).

## 10. Sub-relatórios de BI (Deep Drill-down) e Contexto de Loja

### [NEW] `store_setup.sql`
- Script SQL complementar e não destrutivo para rodar no Supabase.
- **Ação:** `ALTER TABLE audio_files ADD COLUMN IF NOT EXISTS store_id TEXT;`
- **Ação:** `UPDATE audio_files SET store_id = 'Loja Teste' WHERE store_id IS NULL;`
- Adicionar RLS policy garantindo que operações no registro possam acessar/modificar o `store_id`.

### [MODIFY] `public/upload.html`
- Inserir um campo de formulário (Select ou Input) para capturar a `Loja (Store)` antes do envio do arquivo.
- Ajustar a inserção no banco de dados (`supabase.from('audio_files').insert`) para acoplar a variável capturada ao novo campo `store_id`.

### [DELETE] `public/bi.html`
- O dashboard genérico antigo será removido.

### [NEW] Arquitetura de 40 Páginas/Relatórios Individuais (1 Métrica = 1 Tela)
Atendendo à exigência de que **CADA ITEM do JSON deve ter sua página exclusiva**, criaremos um sistema com menu lateral (Sidebar) contendo ~40 links. Ao clicar em um link, uma página dedicada (um layout único) focada 100% naquela métrica será exibida, desenhando os gráficos e tabelas mais adequados.

As "40 páginas" cobrirão granularmente o schema, todas em **Português**:
1. **Identificação de Falantes (`falantes.html`)**: Gráficos de % de fala, interrupções, perguntas abertas vs fechadas.
2. **Estrutura da Conversa (`fases_venda.html`)**: Duração das fases (abordagem, sondagem, etc).
3. **Avaliação do Checklist (`qa_checklist.html`)**: Breakdown de cada item avaliado (Pass/Fail) e as evidências de texto.
4. **Nuvem de Entidades (`nlp_entidades.html`)**: Marcas, produtos e concorrentes extraídos cruamente.
5. **Sentimento da Conversa (`nlp_sentimento.html`)**: Gráfico do cliente vs vendedor.
6. **Emoções Detectadas (`nlp_emocoes.html`)**: Gráfico de frustração, entusiasmo, etc., e quem as sentiu.
7. **Palavras-Chave Frequentes (`nlp_palavras_chave.html`)**: Tabela de frequências.
8. **Tópicos Identificados (`nlp_topicos.html`)**.
9. **Gatilhos de Compra (`nlp_gatilhos.html`)**.
10. **Barreiras de Compra (`nlp_barreiras.html`)**.
11. **Sinais de Urgência (`nlp_urgencia.html`)**: Evidências textuais do cliente apressado.
12. **Taxa de Conversão (`vendas_conversao.html`)**: Motivos de perda vs fechamentos.
13. **Ticket e Descontos (`vendas_ticket.html`)**: Valores finais e % de desconto oferecido.
14. **Timing de Apresentação (`vendas_timing.html`)**: Segundos até falar de preço e até o cliente decidir.
15. **Score de Eficiência (`vendas_score.html`)**.
16. **Cross-sell Esquecido (`perdas_cross_sell.html`)**: Painel de "R$ na mesa" por não ofertar complementares.
17. **Upsell Esquecido (`perdas_upsell.html`)**.
18. **Necessidades Implícitas Não Atendidas (`perdas_implicitas.html`)**.
19. **Promoções e Fidelidade (`perdas_promocoes.html`)**.
20. **Produtos Solicitados vs Apresentados (`produtos_gap.html`)**.
21. **Nível de Engajamento e Conhecimento (`comportamento_nivel.html`)**.
22. **Intenção de Recompra e Indicação (`comportamento_recompra.html`)**.
23. **Perfil Demográfico (`perfil_cliente.html`)**: Idade, gênero, classe socioeconômica, profissão.
24. **Perfil de Consumo (`perfil_consumo.html`)**: Sensibilidade a preço, novo ou recorrente.
25. **Estilos e Canais Preferidos (`perfil_canais.html`)**.
26. **Arquétipo e Psicologia (`psicologia_arquetipo.html`)**: Racional vs Emocional, Risco.
27. **Validação Social e Influência (`psicologia_influencia.html`)**.
28. **Prioridade Qualidade vs Preço (`psicologia_prioridade.html`)**.
29. **Momentos Críticos (`linha_tempo_critica.html`)**: Gráfico de linha do tempo com picos e quedas.
30. **Objeções Verbalizadas (`objecoes_diretas.html`)**: Objeção literal e resposta do vendedor.
31. **Comparações de Concorrência (`concorrencia_comparacao.html`)**: Favorável vs Desfavorável.
32. **Risco de Fuga para Concorrente (`concorrencia_risco.html`)**.
33. **Complexidade e Empatia (`comunicacao_empatia.html`)**.
34. **Técnicas de Venda Detectadas (`comunicacao_tecnicas.html`)**: SPIN, Escassez, etc.
35. **Garantia e Defesa do Consumidor (`compliance_direitos.html`)**.
36. **Práticas Abusivas ou Promessas Falsas (`compliance_riscos.html`)**.
37. **Captura de Contato e Follow-up (`retorno_contato.html`)**: Pegou e-mail/WhatsApp? Prazo prometido?
38. **Previsão de Ticket Futuro e Melhor Data (`preditivo_futuro.html`)**.
39. **Mapa de Calor da Conversa (`heatmap_emocional.html`)**: Blocos 0 a N com intensidade de atenção.
40. **Críticas Veladas (`criticas_ocultas.html`)**: Sarcasmo, desconforto, silêncio.
41. **Score e Gatilhos de Intenção (`intencao_compra.html`)**.

### Implementação Dinâmica (Single Page View, 40 Estados)
Para manter o sistema super rápido (SPA), construíremos um `relatorio_dinamico.html` que possui um Menu Lateral com as 40 opções acima. Ao clicar em uma métrica (ex: "Sentimento da Conversa"), a tela limpa e desenha **exclusivamente** o layout otimizado, os gráficos dedicados e a tabela de dados para aquele item específico do JSON, puxando as traduções 100% em Português.

### [MODIFY] Navbar e Navegação Global
Todas as páginas (HTMLs do projeto) serão atualizadas para remover o menu "BI & Inteligência" e adotar o botão "Relatórios Detalhados" que abrirá o menu lateral com as 40+ páginas.

---
## Verification Plan

### Manual Verification
1. **Implantação de BD**: Acesso o Supabase SQL Editor e rodo a instrução de Schema fornecida por mim no próximo passo.
2. **Teste de Tráfego**: Abrir o Chat (`chat.html`), enviar uma mensagem, e visualizar na tela (HUD) a variação instantânea dos milissegundos, volume de input/output sem lentidão adicional.
3. **Visão Analítica**: Acessar e navegar até `relatorio.html` e ver os dados populados nos gráficos logo na sequência da primeira mensagem de teste.
