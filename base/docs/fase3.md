# FASE 3 — Relatórios Estruturados

> Leia [PLANEJAMENTO.md](../PLANEJAMENTO.md). Pré-requisito: [Fase 2](fase2.md) 100% validada.

## Status

🔴 **NÃO INICIADA**

## Objetivo

Os 9 módulos de relatório param de parsear JSONB livre e passam a ser queries SQL determinísticas sobre as 6 tabelas estruturadas. Comparações entre atendimentos, vendedores e lojas passam a ser possíveis. Cobre as funcionalidades **#6–#10, #17–#22, #27–#34, #40** do docx.

---

## Grupo A — SQL Views (Antigravity gera → MANUAL executa)

### `supabase/05_reporting_views.sql` — [ ] Pendente

```sql
-- vw_checklist_summary: score por atendimento e vendedor
CREATE VIEW vw_checklist_summary AS
SELECT
  ca.transcription_id,
  af.vendor_name,
  af.store_name,
  af.visit_date,
  COUNT(cr.id) FILTER (WHERE cr.verdict = 'SIM') AS items_passed,
  COUNT(cr.id) FILTER (WHERE cr.verdict = 'NAO') AS items_failed,
  COUNT(cr.id) FILTER (WHERE cr.verdict = 'INCONCLUSIVO') AS items_uncertain,
  SUM(cr.weight) FILTER (WHERE cr.verdict = 'SIM') * 100.0 /
    NULLIF(SUM(cr.weight), 0) AS total_score
FROM checklist_results cr
JOIN conversation_analysis ca ON ca.transcription_id = cr.transcription_id
JOIN transcriptions t ON t.id = cr.transcription_id
JOIN audio_files af ON af.id = t.audio_file_id
GROUP BY ca.transcription_id, af.vendor_name, af.store_name, af.visit_date;

-- vw_objections_by_type: contagem e eficácia por tipo (#19 do docx)
CREATE VIEW vw_objections_by_type AS
SELECT
  af.store_name, af.vendor_name,
  o.objection_type,
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE o.efficacy = 'CONTORNOU') AS resolved,
  ROUND(COUNT(*) FILTER (WHERE o.efficacy = 'CONTORNOU') * 100.0 / COUNT(*), 1) AS resolution_rate
FROM objections o
JOIN transcriptions t ON t.id = o.transcription_id
JOIN audio_files af ON af.id = t.audio_file_id
GROUP BY af.store_name, af.vendor_name, o.objection_type;

-- vw_vendor_performance: métricas gerais por vendedor (#17 do docx)
CREATE VIEW vw_vendor_performance AS
SELECT
  af.vendor_name,
  af.store_name,
  COUNT(DISTINCT t.id) AS total_attendances,
  AVG(vcs.total_score) AS avg_checklist_score,
  (ca.analysis_data->'sales_metrics'->'conversion'->>'sale_completed')::boolean AS sale_avg,
  AVG((ca.analysis_data->'speaker_inference'->>'seller_talk_ratio')::float) AS avg_talk_ratio
FROM audio_files af
JOIN transcriptions t ON t.audio_file_id = af.id
JOIN conversation_analysis ca ON ca.transcription_id = t.id
JOIN vw_checklist_summary vcs ON vcs.transcription_id = t.id
GROUP BY af.vendor_name, af.store_name, ca.analysis_data;

-- vw_intent_distribution (#7, #9 do docx)
CREATE VIEW vw_intent_distribution AS
SELECT
  af.store_name,
  ca.analysis_data->'purchase_intent'->>'intent_classification' AS intent,
  COUNT(*) AS total
FROM conversation_analysis ca
JOIN transcriptions t ON t.id = ca.transcription_id
JOIN audio_files af ON af.id = t.audio_file_id
GROUP BY af.store_name, intent;

-- vw_lost_opportunities (#7, #8 do docx)
CREATE VIEW vw_lost_opportunities AS
SELECT
  af.store_name, af.vendor_name, af.visit_date,
  SUM(lo.estimated_value) AS total_value_lost,
  lo.opportunity_type, lo.product
FROM lost_opportunities lo
JOIN transcriptions t ON t.id = lo.transcription_id
JOIN audio_files af ON af.id = t.audio_file_id
GROUP BY af.store_name, af.vendor_name, af.visit_date, lo.opportunity_type, lo.product;

-- vw_conversation_heatmap (#40 do docx)
CREATE VIEW vw_conversation_heatmap AS
SELECT
  ca.transcription_id,
  jsonb_array_elements(ca.analysis_data->'conversation_heatmap') AS segment
FROM conversation_analysis ca;
```

**Critério:** Todas as views retornam dados para os atendimentos da Fase 2.

---

## Grupo B — Módulos de Relatório (Python FastAPI + Frontend HTML)

### `api/routers/reports.py` — [ ] Pendente

Endpoints para cada view:
- `GET /api/reports/checklist?store=&vendor=&from=&to=`
- `GET /api/reports/objections?store=&vendor=`
- `GET /api/reports/vendor-performance?store=`
- `GET /api/reports/intent?store=`
- `GET /api/reports/opportunities?store=`
- `GET /api/reports/heatmap?transcription_id=`
- `GET /api/reports/benchmarking?store=`  (#17 do docx)

Todas as queries incluem filtro por `user_id` (via Supabase Auth token no header).

### `public/analise.html` — 9 Módulos de Relatório — [ ] Pendente

Cada módulo consome seu endpoint específico:

| Módulo | Endpoint | Funcionalidade do docx |
|--------|---------|------------------------|
| `r_qa_heatmap` | `/api/reports/checklist` + `/heatmap` | #5 (checklist score) + #40 (heatmap) |
| `r_vendas` | `/api/reports/vendor-performance` | #6 (conversão, ticket médio) |
| `r_oportunidades` | `/api/reports/opportunities` | #7 (cross/up-sell) + #8 (produtos) |
| `r_atrito` | `/api/reports/objections` | #19 (catálogo de objeções) |
| `r_nlp` | `conversation_analysis` data | #3 (NLP: entidades, keywords) |
| `r_comportamento` | `conversation_analysis` data | #11, #15, #16 (perfil, arquétipo) |
| `r_intencao_preditivo` | `/api/reports/intent` | #9 (tendências) + #39 (preditivo) |
| `r_falantes_fases` | `conversation_analysis` data | #10 (tempo por fase, ratio) |
| `r_compliance_followup` | `conversation_analysis` data | #20 (compliance) + #34 (follow-up) |

Todos os módulos são expansíveis/colapsáveis e editáveis (campos de anotação manual).

### `public/relatorio.html` — Relatórios Históricos + Benchmarking — [ ] Pendente

**Filtros globais (reagem em tempo real):**
- Loja (dropdown)
- Vendedor (dropdown, filtrado por loja)
- Período (data início / data fim)
- Tipo de análise

**Seções:**
- Ranking de performance: ORDER BY avg_checklist_score (#17 do docx)
- Evolução temporal do score por vendedor (chart.js linha)
- Mapa de calor de objeções por tipo e loja (#19)
- Tendências de comportamento por período (#9)
- Gaps por vendedor: itens em que mais falha (#21 do docx)

### `public/analise.html` — Player + Transcrição Interativa — [ ] Pendente

- Player HTML5 com áudio do Supabase Storage (#27 do docx)
- Timeline de fases sobreposta ao player
- Ao clicar em turno da transcrição → player salta para timestamp (#28 do docx)
- Highlights de entidades detectadas (produto, preço, concorrente) sobre o texto (#28 do docx)

### Exportação — [ ] Pendente

- TXT/JSON/CSV (existente — manter)
- **PDF:** `window.print()` com CSS de impressão (`@media print`) (#29 do docx)
- Compartilhamento: link público seguro com hash único por relatório

---

## Checklist de Validação da Fase 3

> [!CAUTION]
> **A Fase 4 só começa após TODOS os itens confirmados.**

- [ ] `05_reporting_views.sql` executado → todas as 6 views no Supabase
- [ ] Views retornam dados corretos para atendimentos da Fase 2
- [ ] Todos os 9 módulos carregam sem erros em `analise.html`
- [ ] Filtro por loja + período atualiza todos os módulos simultaneamente
- [ ] Ranking de vendedores exibe comparativo com ≥ 2 vendedores
- [ ] Player de áudio sincronizado com as fases da conversa
- [ ] Highlights de entidades visíveis na transcrição interativa
- [ ] Exportação PDF gera arquivo com dados do atendimento
- [ ] Gaps por vendedor exibidos no relatório histórico
- [ ] Commit com tag `fase3-completa`

**→ Quando validado, avançar para [docs/fase4.md](fase4.md)**
