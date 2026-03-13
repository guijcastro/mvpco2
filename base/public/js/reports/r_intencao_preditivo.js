// ==========================================
// REPORT: Intenção de Compra
// ==========================================
window.renderPurchaseIntent = function (data, canvas) {
    if (data.length === 0) return renderEmpty(canvas);

    let scores = [], classifications = {};

    data.forEach(row => {
        const pi = row.classification_data.purchase_intent;
        if (!pi) return;
        if (typeof pi.intent_score === 'number') scores.push(pi.intent_score);
        const cls = pi.intent_classification;
        if (cls) {
            const labels = { browsing: 'Apenas Olhando', researching: 'Pesquisando', ready_to_buy: 'Pronto para Comprar', urgent_buyer: 'Comprador Urgente', uncertain: 'Incerto' };
            const label = labels[cls] || cls;
            classifications[label] = (classifications[label] || 0) + 1;
        }
    });

    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const scoreColor = avgScore >= 70 ? '#10b981' : avgScore >= 40 ? '#f59e0b' : '#f43f5e';

    const clsLabels = Object.keys(classifications);

    canvas.innerHTML = `
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div class="report-card col-span-1 sm:col-span-2 flex items-center gap-6">
                <div class="w-28 h-28 rounded-full flex items-center justify-center border-8 flex-shrink-0" style="border-color:${scoreColor}">
                    <span class="text-3xl font-black" style="color:${scoreColor}">${avgScore}</span>
                </div>
                <div>
                    <p class="stat-label">Score Médio de Intenção de Compra</p>
                    <p class="text-sm text-gray-500 mt-1">${avgScore >= 70 ? '🔥 Base altamente compradora. Foco em não perder tempo.' : avgScore >= 40 ? '⚠️ Clientela mista — trabalhe bem a sondagem.' : '🧊 Clientes em fase de pesquisa. Fidelize com informação.'}</p>
                </div>
            </div>
            <div class="report-card text-center">
                <p class="stat-label mb-2">Amostra</p>
                <p class="stat-value">${scores.length}</p>
            </div>
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="report-card">
                <h3 class="text-sm font-bold text-gray-800 uppercase mb-4">Classificação de Intenção por Perfil</h3>
                ${clsLabels.length === 0 ? '<p class="text-sm text-gray-400">Dados insuficientes.</p>' : `<div style="height:250px; position:relative;"><canvas id="chart-intent-cls"></canvas></div>`}
            </div>
            <div class="report-card">
                <h3 class="text-sm font-bold text-gray-800 uppercase mb-4">Distribuição de Score (0–100)</h3>
                ${scores.length === 0 ? '<p class="text-sm text-gray-400">Dados insuficientes.</p>' : `<div style="height:250px; position:relative;"><canvas id="chart-intent-score"></canvas></div>`}
            </div>
        </div>
    `;

    if (clsLabels.length > 0) {
        createChartJS(document.getElementById('chart-intent-cls').getContext('2d'), 'doughnut', {
            labels: clsLabels, datasets: [{ data: clsLabels.map(l => classifications[l]), backgroundColor: ChartColors.mixed, borderWidth: 0 }]
        }, { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } });
    }
    if (scores.length > 0) {
        const buckets = { '0–25': 0, '26–50': 0, '51–75': 0, '76–100': 0 };
        scores.forEach(s => { if (s <= 25) buckets['0–25']++; else if (s <= 50) buckets['26–50']++; else if (s <= 75) buckets['51–75']++; else buckets['76–100']++; });
        createChartJS(document.getElementById('chart-intent-score').getContext('2d'), 'bar', {
            labels: Object.keys(buckets), datasets: [{ data: Object.values(buckets), backgroundColor: ['#f43f5e', '#f59e0b', '#60a5fa', '#10b981'], borderRadius: 4 }]
        }, { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } });
    }
};

// ==========================================
// REPORT: Gatilhos de Compra
// ==========================================
window.renderBuyTriggers = function (data, canvas) {
    if (data.length === 0) return renderEmpty(canvas);

    let triggers = {}, barriers = {};
    data.forEach(row => {
        const pi = row.classification_data.purchase_intent;
        (pi?.high_intent_signals || []).forEach(s => { triggers[s] = (triggers[s] || 0) + 1; });
        (pi?.low_intent_signals || []).forEach(s => { barriers[s] = (barriers[s] || 0) + 1; });
        (row.classification_data.nlp_analysis?.buy_triggers_detected || []).forEach(s => { triggers[s] = (triggers[s] || 0) + 1; });
    });

    const tLabels = Object.keys(triggers).sort((a, b) => triggers[b] - triggers[a]).slice(0, 12);
    const bLabels = Object.keys(barriers).sort((a, b) => barriers[b] - barriers[a]).slice(0, 12);

    canvas.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="report-card border-green-200">
                <h3 class="text-sm font-bold text-green-800 uppercase mb-4">🚀 Gatilhos de Alta Intenção</h3>
                ${tLabels.length === 0 ? '<p class="text-sm text-gray-400">Nenhum gatilho identificado.</p>' : `<div style="height:280px; position:relative;"><canvas id="chart-triggers"></canvas></div>`}
            </div>
            <div class="report-card border-red-200">
                <h3 class="text-sm font-bold text-red-800 uppercase mb-4">🧊 Sinais de Baixa Intenção</h3>
                ${bLabels.length === 0 ? '<p class="text-sm text-gray-400">Nenhum sinal de baixa intenção registrado.</p>' : `<div style="height:280px; position:relative;"><canvas id="chart-barriers"></canvas></div>`}
            </div>
        </div>`;

    if (tLabels.length > 0) createChartJS(document.getElementById('chart-triggers').getContext('2d'), 'bar', {
        labels: tLabels, datasets: [{ label: 'Frequência', data: tLabels.map(l => triggers[l]), backgroundColor: '#10b981', borderRadius: 4 }]
    }, { responsive: true, maintainAspectRatio: false, indexAxis: 'y', scales: { x: { beginAtZero: true } } });

    if (bLabels.length > 0) createChartJS(document.getElementById('chart-barriers').getContext('2d'), 'bar', {
        labels: bLabels, datasets: [{ label: 'Frequência', data: bLabels.map(l => barriers[l]), backgroundColor: '#f43f5e', borderRadius: 4 }]
    }, { responsive: true, maintainAspectRatio: false, indexAxis: 'y', scales: { x: { beginAtZero: true } } });
};

// ==========================================
// REPORT: Urgência
// ==========================================
window.renderUrgency = function (data, canvas) {
    if (data.length === 0) return renderEmpty(canvas);

    let urgentCount = 0, evidences = [];

    data.forEach(row => {
        const nlp = row.classification_data.nlp_analysis;
        if (!nlp) return;
        if (nlp.urgency_detected) { urgentCount++; if (nlp.urgency_evidence) evidences.push(nlp.urgency_evidence); }
    });

    const urgencyRate = data.length > 0 ? ((urgentCount / data.length) * 100).toFixed(0) : 0;

    const evidenceHtml = evidences.slice(0, 8).map(e => `
        <div class="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-900 italic">"${e}"</div>
    `).join('');

    canvas.innerHTML = `
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div class="report-card">
                <p class="stat-label mb-2">Atendimentos com Sinal de Urgência</p>
                <p class="stat-value text-orange-600">${urgentCount} <span class="text-sm font-normal text-gray-500">de ${data.length} (${urgencyRate}%)</span></p>
            </div>
            <div class="report-card bg-orange-50 border-orange-200 flex items-center gap-3">
                <i data-lucide="alert-circle" class="w-8 h-8 text-orange-500 flex-shrink-0"></i>
                <p class="text-sm text-orange-800">Cliente urgente exige agilidade real. Os protocolos de lentidão no fechamento custam vendas inteiras neste perfil.</p>
            </div>
        </div>
        <div class="report-card">
            <h3 class="text-sm font-bold text-gray-800 uppercase mb-4">Trechos de Urgência Detectados</h3>
            <div class="flex flex-col gap-3">${evidenceHtml || '<p class="text-sm text-gray-400 italic">Nenhuma evidência de urgência registrada.</p>'}</div>
        </div>
    `;
    lucide.createIcons();
};

// ==========================================
// REPORT: Preditivo
// ==========================================
window.renderPredictive = function (data, canvas) {
    if (data.length === 0) return renderEmpty(canvas);

    let convProbs = [], churnRisk = {}, timings = {}, topProducts = {};

    data.forEach(row => {
        const pr = row.classification_data.predictive;
        if (!pr) return;
        if (typeof pr.conversion_probability === 'number') convProbs.push(pr.conversion_probability);
        const cr = pr.churn_risk || 'unknown';
        const crMap = { high: 'Alto Risco', medium: 'Médio Risco', low: 'Baixo Risco', not_applicable: 'N/A' };
        const crLabel = crMap[cr] || cr;
        churnRisk[crLabel] = (churnRisk[crLabel] || 0) + 1;
        if (pr.best_follow_up_timing) { timings[pr.best_follow_up_timing] = (timings[pr.best_follow_up_timing] || 0) + 1; }
        (pr.top_products_for_next_visit || []).forEach(p => { topProducts[p] = (topProducts[p] || 0) + 1; });
    });

    const avgConv = convProbs.length > 0 ? ((convProbs.reduce((a, b) => a + b, 0) / convProbs.length) * 100).toFixed(1) : 0;
    const topProds = Object.keys(topProducts).sort((a, b) => topProducts[b] - topProducts[a]).slice(0, 8);
    const timingLabels = Object.keys(timings).sort((a, b) => timings[b] - timings[a]).slice(0, 6);

    canvas.innerHTML = `
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div class="report-card text-center col-span-1">
                <p class="stat-label mb-2">Prob. Média de Conversão Futura</p>
                <p class="stat-value text-blue-700">${avgConv}%</p>
            </div>
            <div class="report-card col-span-1 sm:col-span-2">
                <h3 class="text-sm font-bold text-gray-800 uppercase mb-4">Risco de Churn por Classificação</h3>
                <div style="height:120px; position:relative;"><canvas id="chart-churn"></canvas></div>
            </div>
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="report-card">
                <h3 class="text-sm font-bold text-gray-800 uppercase mb-4">Melhor Janela de Follow-up</h3>
                ${timingLabels.length === 0 ? '<p class="text-sm text-gray-400">Sem dados.</p>' : `<div style="height:200px; position:relative;"><canvas id="chart-timing-pred"></canvas></div>`}
            </div>
            <div class="report-card">
                <h3 class="text-sm font-bold text-gray-800 uppercase mb-4">Top Produtos para Próxima Visita</h3>
                ${topProds.length === 0 ? '<p class="text-sm text-gray-400">Sem dados de produtos preditivos.</p>' : `<div style="height:200px; position:relative;"><canvas id="chart-top-next"></canvas></div>`}
            </div>
        </div>
    `;

    const churnLabels = Object.keys(churnRisk);
    if (churnLabels.length > 0) createChartJS(document.getElementById('chart-churn').getContext('2d'), 'bar', {
        labels: churnLabels, datasets: [{ data: churnLabels.map(l => churnRisk[l]), backgroundColor: ['#f43f5e', '#f59e0b', '#10b981', '#94a3b8'], borderRadius: 4 }]
    }, { responsive: true, maintainAspectRatio: false, indexAxis: 'x', plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } });

    if (timingLabels.length > 0) createChartJS(document.getElementById('chart-timing-pred').getContext('2d'), 'doughnut', {
        labels: timingLabels, datasets: [{ data: timingLabels.map(l => timings[l]), backgroundColor: ChartColors.mixed, borderWidth: 0 }]
    }, { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { font: { size: 11 } } } } });

    if (topProds.length > 0) createChartJS(document.getElementById('chart-top-next').getContext('2d'), 'bar', {
        labels: topProds, datasets: [{ data: topProds.map(l => topProducts[l]), backgroundColor: '#8b5cf6', borderRadius: 4 }]
    }, { responsive: true, maintainAspectRatio: false, indexAxis: 'y', scales: { x: { beginAtZero: true } } });
};
