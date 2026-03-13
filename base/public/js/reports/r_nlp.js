// ==========================================
// REPORT: Balanço de Sentimento
// ==========================================
window.renderSentiment = function (data, canvas) {
    if (data.length === 0) return renderEmpty(canvas);

    let overall = {}, clientSent = {}, sellerSent = {};
    const sentMap = { positive: 'Positivo', neutral: 'Neutro', negative: 'Negativo', mixed: 'Misto' };

    data.forEach(row => {
        const s = row.classification_data.nlp_analysis?.sentiment;
        if (!s) return;
        if (s.overall) { const l = sentMap[s.overall] || s.overall; overall[l] = (overall[l] || 0) + 1; }
        if (s.client_sentiment) { const l = sentMap[s.client_sentiment] || s.client_sentiment; clientSent[l] = (clientSent[l] || 0) + 1; }
        if (s.seller_sentiment) { const l = sentMap[s.seller_sentiment] || s.seller_sentiment; sellerSent[l] = (sellerSent[l] || 0) + 1; }
    });

    canvas.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div class="report-card"><h3 class="text-sm font-bold uppercase mb-3">Sentimento Geral da Conversa</h3><div style="height:220px;position:relative;"><canvas id="chart-sent-overall"></canvas></div></div>
            <div class="report-card"><h3 class="text-sm font-bold uppercase mb-3">Sentimento do Cliente</h3><div style="height:220px;position:relative;"><canvas id="chart-sent-client"></canvas></div></div>
            <div class="report-card"><h3 class="text-sm font-bold uppercase mb-3">Sentimento do Vendedor</h3><div style="height:220px;position:relative;"><canvas id="chart-sent-seller"></canvas></div></div>
        </div>
    `;
    const sentColors = { Positivo: '#10b981', Neutro: '#94a3b8', Negativo: '#f43f5e', Misto: '#f59e0b' };
    const makeDonut = (id, d) => {
        const l = Object.keys(d);
        createChartJS(document.getElementById(id).getContext('2d'), 'doughnut', {
            labels: l, datasets: [{ data: l.map(k => d[k]), backgroundColor: l.map(k => sentColors[k] || '#8b5cf6'), borderWidth: 0 }]
        }, { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } } } });
    };
    if (Object.keys(overall).length) makeDonut('chart-sent-overall', overall);
    if (Object.keys(clientSent).length) makeDonut('chart-sent-client', clientSent);
    if (Object.keys(sellerSent).length) makeDonut('chart-sent-seller', sellerSent);
};

// ==========================================
// REPORT: Radar de Emoções
// ==========================================
window.renderEmotions = function (data, canvas) {
    if (data.length === 0) return renderEmpty(canvas);

    let emotionTally = {};
    const emotMap = { frustration: 'Frustração', enthusiasm: 'Entusiasmo', doubt: 'Dúvida', urgency: 'Urgência', satisfaction: 'Satisfação', indifference: 'Tédio', anxiety: 'Ansiedade', confidence: 'Confiança', fatigue: 'Cansaço', distrust: 'Desconfiança' };

    data.forEach(row => {
        const emotions = row.classification_data.nlp_analysis?.emotions_detected;
        if (!Array.isArray(emotions)) return;
        emotions.forEach(e => {
            const label = emotMap[e.emotion] || e.emotion;
            emotionTally[label] = (emotionTally[label] || 0) + 1;
        });
    });

    const labels = Object.keys(emotionTally).sort((a, b) => emotionTally[b] - emotionTally[a]);
    if (labels.length === 0) return renderEmpty(canvas, "Nenhuma emoção detectada nestes áudios.");

    canvas.innerHTML = `
        <div class="report-card mb-6">
            <h3 class="text-sm font-bold uppercase mb-4">Frequência de Emoções Detectadas (Ambos os Lados)</h3>
            <div style="height:330px;position:relative;"><canvas id="chart-emotions"></canvas></div>
        </div>
    `;
    createChartJS(document.getElementById('chart-emotions').getContext('2d'), 'bar', {
        labels, datasets: [{ label: 'Ocorrências', data: labels.map(l => emotionTally[l]), backgroundColor: ChartColors.mixed.concat(ChartColors.blue), borderRadius: 4 }]
    }, { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true } } });
};

// ==========================================
// REPORT: Nuvem de Entidades
// ==========================================
window.renderEntities = function (data, canvas) {
    if (data.length === 0) return renderEmpty(canvas);

    let products = {}, brands = {}, competitors = {};
    data.forEach(row => {
        const e = row.classification_data.nlp_analysis?.entities;
        if (!e) return;
        (e.products_mentioned || []).forEach(p => { products[p] = (products[p] || 0) + 1; });
        (e.brands_mentioned || []).forEach(b => { brands[b] = (brands[b] || 0) + 1; });
        (e.competitors_mentioned || []).forEach(c => { competitors[c] = (competitors[c] || 0) + 1; });
    });

    const pLabels = Object.keys(products).sort((a, b) => products[b] - products[a]).slice(0, 12);
    const bLabels = Object.keys(brands).sort((a, b) => brands[b] - brands[a]).slice(0, 8);
    const cLabels = Object.keys(competitors).sort((a, b) => competitors[b] - competitors[a]).slice(0, 8);

    canvas.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div class="report-card">
                <h3 class="text-sm font-bold uppercase mb-4">Produtos Mais Mencionados</h3>
                ${pLabels.length === 0 ? '<p class="text-gray-400 text-sm">Nenhum produto extraído.</p>' : `<div style="height:240px;position:relative;"><canvas id="chart-products-nlp"></canvas></div>`}
            </div>
            <div class="report-card">
                <h3 class="text-sm font-bold uppercase mb-4">Marcas & Concorrentes Mais Citados</h3>
                ${bLabels.length + cLabels.length === 0 ? '<p class="text-gray-400 text-sm">Nenhuma marca ou concorrente extraída.</p>' : `<div style="height:240px;position:relative;"><canvas id="chart-brands-nlp"></canvas></div>`}
            </div>
        </div>
    `;
    if (pLabels.length) createChartJS(document.getElementById('chart-products-nlp').getContext('2d'), 'bar', {
        labels: pLabels, datasets: [{ data: pLabels.map(l => products[l]), backgroundColor: '#3b82f6', borderRadius: 4 }]
    }, { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true } } });

    if (bLabels.length + cLabels.length > 0) {
        const allBrands = [...bLabels, ...cLabels.filter(c => !bLabels.includes(c))];
        const colors = allBrands.map(l => cLabels.includes(l) ? '#f43f5e' : '#10b981');
        createChartJS(document.getElementById('chart-brands-nlp').getContext('2d'), 'bar', {
            labels: allBrands, datasets: [{ data: allBrands.map(l => (brands[l] || 0) + (competitors[l] || 0)), backgroundColor: colors, borderRadius: 4 }]
        }, { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true } } });
    }
};

// ==========================================
// REPORT: Keywords
// ==========================================
window.renderKeywords = function (data, canvas) {
    if (data.length === 0) return renderEmpty(canvas);

    let kw = {};
    data.forEach(row => {
        const kws = row.classification_data.nlp_analysis?.keywords_frequency;
        if (!Array.isArray(kws)) return;
        kws.forEach(k => { if (k.keyword && k.count) kw[k.keyword] = (kw[k.keyword] || 0) + k.count; });
    });

    const labels = Object.keys(kw).sort((a, b) => kw[b] - kw[a]).slice(0, 20);
    if (labels.length === 0) return renderEmpty(canvas, "Nenhuma palavra-chave registrada.");

    canvas.innerHTML = `
        <div class="report-card">
            <h3 class="text-sm font-bold uppercase mb-4">Words Mais Usadas (Frequência Acumulada)</h3>
            <div style="height:420px;position:relative;"><canvas id="chart-kw"></canvas></div>
        </div>
    `;
    createChartJS(document.getElementById('chart-kw').getContext('2d'), 'bar', {
        labels, datasets: [{ data: labels.map(l => kw[l]), backgroundColor: '#0ea5e9', borderRadius: 4 }]
    }, { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true } } });
};
