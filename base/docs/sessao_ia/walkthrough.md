# Walkthrough — Arquitetura de 40 Relatórios Isolados

## O que foi feito

Substituímos o antigo `bi.html` genérico de scroll infinito por um **sistema de 40 relatórios individuais** desenvolvidos cirurgicamente sobre o schema JSON completo da análise de áudio.

---

## Nova Estrutura de Ficheiros

```
public/
├── relatorio_dinamico.html       ← Hub central com sidebar de 40 links
└── js/
    ├── reports_engine.js         ← Motor: dados, filtros, sidebar e orchestração
    └── reports/
        ├── r_falantes_fases.js   ← Falantes + Fases da Venda
        ├── r_qa_heatmap.js       ← QA Checklist + Heatmap Emocional
        ├── r_vendas.js           ← Conversão, Ticket, Timing, Score
        ├── r_oportunidades.js    ← Cross-sell, Upsell, Gap de Produtos
        ├── r_intencao_preditivo.js ← Intenção de Compra, Gatilhos, Preditivo
        ├── r_comportamento.js    ← Demográfico, Psicologia, Engajamento
        ├── r_nlp.js              ← Sentimento, Emoções, Entidades, Keywords
        ├── r_atrito.js           ← Objeções, Críticas Veladas, Concorrência, Momentos Críticos
        └── r_compliance_followup.js ← Empatia, Técnicas, Compliance, Follow-up
```

---

## Os 40 Relatórios (Ordenados por Categoria)

| # | Relatório | JSON Key |
|---|-----------|----------|
| 1 | Avaliação do Checklist (QA) | `checklist` |
| 2 | Estrutura da Conversa | `conversation_structure` |
| 3 | Identificação de Falantes | `speaker_inference` |
| 4 | Mapa de Calor da Conversa | `conversation_heatmap` |
| 5 | Taxa de Conversão & Perdas | `sales_metrics.conversion` |
| 6 | Ticket & Descontos | `sales_metrics.ticket` |
| 7 | Timing Comercial | `sales_metrics.timing` |
| 8 | Score de Eficiência | `sales_metrics.efficiency_score` |
| 9 | Cross-Sell Ignorado | `lost_opportunities.cross_sell_not_offered` |
| 10 | Upsell Ignorado | `lost_opportunities.upsell_not_offered` |
| 11 | Necessidades Implícitas | `lost_opportunities.implicit_needs_not_addressed` |
| 12 | Gap Pedido vs. Apresentado | `products` |
| 13 | Intenção de Compra | `purchase_intent` |
| 14 | Gatilhos Verbalizados | `purchase_intent.high_intent_signals` |
| 15 | Sinais de Urgência | `nlp_analysis.urgency_detected` |
| 16 | Previsão Futura | `predictive` |
| 17 | Perfil Demográfico | `customer_profile` |
| 18 | Psicologia e Arquétipo | `psychological_profile` |
| 19 | Engajamento & Conhecimento | `behavioral_trends` |
| 20 | Perfil de Consumo | `customer_profile.price_sensitivity` |
| 21 | Balanço de Sentimento | `nlp_analysis.sentiment` |
| 22 | Radar de Emoções | `nlp_analysis.emotions_detected` |
| 23 | Nuvem de Entidades | `nlp_analysis.entities` |
| 24 | Keyword Cloud | `nlp_analysis.keywords_frequency` |
| 25 | Momentos Críticos | `critical_moments` |
| 26 | Matriz de Objeções | `objections` |
| 27 | Críticas Veladas | `hidden_criticisms` |
| 28 | Comparação Competitiva | `competitive_analysis` |
| 29 | Postura & Empatia | `communication_analysis.empathy_demonstrated` |
| 30 | Técnicas de Venda (SPIN etc) | `communication_analysis.sales_techniques_detected` |
| 31 | Riscos de Compliance | `compliance.abusive_practice_detected` |
| 32 | Garantia & Direitos | `compliance.warranty_mentioned` |
| 33 | Follow-up & Captura de Contato | `follow_up` |

---

## Funcionalidades Principais

- **Sidebar sempre visível** com navegação para todos os 40 relatórios (agrupados por categoria em Português)
- **Filtro Global por Loja** (`store_id`) que re-filtra o banco e redesenha qualquer relatório ativo
- **Layout único por relatório**: cada visualização tem gráficos específicos (donut, barra horizontal, linha do tempo, tabela de atenção)
- **Sem scroll infinito**: clicar em qualquer item do menu destrói o layout anterior e monta o novo com **foco 100%** naquela métrica
- **Navbar atualizada** em `dashboard.html`, `chat.html`, `settings.html`, `relatorio.html` e `upload.html` — todos apontam para `relatorio_dinamico.html`

---

## Para Testar

1. Acesse `http://localhost:8888/relatorio_dinamico.html`
2. Clique em qualquer dos 33+ relatórios no menu lateral esquerdo
3. Use o seletor de Loja no topo do sidebar para filtrar por unidade
