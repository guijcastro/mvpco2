// ==========================================
// REPORT: Taxa de Conversão
// ==========================================
window.renderConversion = function (data, canvas) {
    if (data.length === 0) return renderEmpty(canvas);

    let sold = 0, lost = 0;
    let lossReasons = {};

    data.forEach(row => {
        const sm = row.classification_data.sales_metrics;
        if (!sm || !sm.conversion) return;
        if (sm.conversion.sale_completed) { sold++; }
        else {
            lost++;
            const reason = sm.conversion.loss_reason || 'Não especificado';
            lossReasons[reason] = (lossReasons[reason] || 0) + 1;
        }
    });

    const total = sold + lost;
    if (total === 0) return renderEmpty(canvas, "Nenhum dado de conversão encontrado.");

    const rate = ((sold / total) * 100).toFixed(1);
    const rateColor = rate >= 70 ? 'text-green-600' : rate >= 45 ? 'text-yellow-600' : 'text-red-600';

    const reasonLabels = Object.keys(lossReasons);
    const reasonVals = reasonLabels.map(k => lossReasons[k]);

    canvas.innerHTML = `
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div class="report-card text-center">
                <p class="stat-label mb-2">Taxa de Conversão</p>
                <p class="stat-value ${rateColor}">${rate}%</p>
            </div>
            <div class="report-card text-center">
                <p class="stat-label mb-2">✅ Vendas Fechadas</p>
                <p class="stat-value text-green-600">${sold}</p>
            </div>
            <div class="report-card text-center">
                <p class="stat-label mb-2">❌ Perdidas / Sem Fechamento</p>
                <p class="stat-value text-red-600">${lost}</p>
            </div>
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="report-card">
                <h3 class="text-sm font-bold text-gray-800 uppercase mb-4">Funil — Fechado vs Perdido</h3>
                <div style="height:240px; position:relative;">
                    <canvas id="chart-conv-ratio"></canvas>
                </div>
            </div>
            <div class="report-card">
                <h3 class="text-sm font-bold text-gray-800 uppercase mb-4">Motivos de Não Conversão</h3>
                ${reasonLabels.length === 0 ? '<p class="text-sm text-gray-400 italic">Nenhum motivo registrado.</p>' : `<div style="height:240px; position:relative;"><canvas id="chart-loss-reasons"></canvas></div>`}
            </div>
        </div>
    `;

    createChartJS(document.getElementById('chart-conv-ratio').getContext('2d'), 'doughnut', {
        labels: ['Vendas Concluídas', 'Vendas Perdidas'],
        datasets: [{ data: [sold, lost], backgroundColor: ['#10b981', '#f43f5e'], borderWidth: 0 }]
    }, { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } });

    if (reasonLabels.length > 0) {
        createChartJS(document.getElementById('chart-loss-reasons').getContext('2d'), 'bar', {
            labels: reasonLabels,
            datasets: [{ label: 'Qtd', data: reasonVals, backgroundColor: '#f59e0b', borderRadius: 4 }]
        }, { responsive: true, maintainAspectRatio: false, indexAxis: 'y', scales: { x: { beginAtZero: true } } });
    }
};

// ==========================================
// REPORT: Ticket & Descontos
// ==========================================
window.renderTicket = function (data, canvas) {
    if (data.length === 0) return renderEmpty(canvas);

    let values = [], discounts = [], premiumCount = 0;

    data.forEach(row => {
        const tk = row.classification_data.sales_metrics?.ticket;
        if (!tk) return;
        if (typeof tk.final_value_mentioned === 'number') values.push(tk.final_value_mentioned);
        if (typeof tk.discount_percentage === 'number') discounts.push(tk.discount_percentage);
        if (tk.premium_offer_made) premiumCount++;
    });

    const avgTicket = values.length > 0 ? (values.reduce((a, b) => a + b, 0) / values.length) : 0;
    const avgDiscount = discounts.length > 0 ? (discounts.reduce((a, b) => a + b, 0) / discounts.length) : 0;

    canvas.innerHTML = `
        <div class="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
            <div class="report-card text-center">
                <p class="stat-label mb-2">Ticket Médio</p>
                <p class="stat-value text-blue-700">R$ ${avgTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
            <div class="report-card text-center">
                <p class="stat-label mb-2">Desconto Médio</p>
                <p class="stat-value text-orange-600">${avgDiscount.toFixed(1)}%</p>
            </div>
            <div class="report-card text-center">
                <p class="stat-label mb-2">Produto Premium Ofertado</p>
                <p class="stat-value text-purple-600">${premiumCount}x</p>
            </div>
            <div class="report-card text-center">
                <p class="stat-label mb-2">Total de Tickets</p>
                <p class="stat-value">${values.length}</p>
            </div>
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="report-card">
                <h3 class="text-sm font-bold text-gray-800 uppercase mb-4">Distribuição de Valores Finais</h3>
                <div style="height:250px; position:relative;"><canvas id="chart-ticket-dist"></canvas></div>
            </div>
            <div class="report-card">
                <h3 class="text-sm font-bold text-gray-800 uppercase mb-4">Premium Ofertado vs Não Ofertado</h3>
                <div style="height:250px; position:relative;"><canvas id="chart-premium"></canvas></div>
            </div>
        </div>
    `;

    // Group ticket values into brackets
    const brackets = { '< R$500': 0, 'R$500 – 1k': 0, 'R$1k – 3k': 0, 'R$3k – 5k': 0, '> R$5k': 0 };
    values.forEach(v => {
        if (v < 500) brackets['< R$500']++;
        else if (v < 1000) brackets['R$500 – 1k']++;
        else if (v < 3000) brackets['R$1k – 3k']++;
        else if (v < 5000) brackets['R$3k – 5k']++;
        else brackets['> R$5k']++;
    });

    createChartJS(document.getElementById('chart-ticket-dist').getContext('2d'), 'bar', {
        labels: Object.keys(brackets), datasets: [{ data: Object.values(brackets), backgroundColor: '#3b82f6', borderRadius: 4 }]
    }, { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } });

    createChartJS(document.getElementById('chart-premium').getContext('2d'), 'doughnut', {
        labels: ['Premium Ofertado', 'Não Ofertado'],
        datasets: [{ data: [premiumCount, data.length - premiumCount], backgroundColor: ['#8b5cf6', '#e2e8f0'], borderWidth: 0 }]
    }, { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } });
};

// ==========================================
// REPORT: Timing Comercial
// ==========================================
window.renderTiming = function (data, canvas) {
    if (data.length === 0) return renderEmpty(canvas);

    let t2Product = [], t2Price = [], t2Decision = [];

    data.forEach(row => {
        const tm = row.classification_data.sales_metrics?.timing;
        if (!tm) return;
        if (typeof tm.time_to_first_product_mention_seconds === 'number') t2Product.push(tm.time_to_first_product_mention_seconds);
        if (typeof tm.time_to_price_presentation_seconds === 'number') t2Price.push(tm.time_to_price_presentation_seconds);
        if (typeof tm.decision_time_after_price_seconds === 'number') t2Decision.push(tm.decision_time_after_price_seconds);
    });

    const avg = arr => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;

    canvas.innerHTML = `
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div class="report-card text-center">
                <p class="stat-label mb-2">Até 1ª Menção de Produto</p>
                <p class="stat-value text-blue-700">${avg(t2Product)}s</p>
            </div>
            <div class="report-card text-center">
                <p class="stat-label mb-2">Até Apresentar Preço</p>
                <p class="stat-value text-orange-600">${avg(t2Price)}s</p>
            </div>
            <div class="report-card text-center">
                <p class="stat-label mb-2">Decisão Após Preço</p>
                <p class="stat-value text-green-700">${avg(t2Decision)}s</p>
            </div>
        </div>
        <div class="report-card">
            <h3 class="text-sm font-bold text-gray-800 uppercase mb-4">Benchmark: Velocidade Comercial Média</h3>
            <div style="height:280px; position:relative;"><canvas id="chart-timing-bar"></canvas></div>
        </div>
    `;

    createChartJS(document.getElementById('chart-timing-bar').getContext('2d'), 'bar', {
        labels: ['Até Produto (s)', 'Até Preço (s)', 'Decisão Após Preço (s)'],
        datasets: [{ label: 'Média dos Atendimentos', data: [avg(t2Product), avg(t2Price), avg(t2Decision)], backgroundColor: ['#3b82f6', '#f59e0b', '#10b981'], borderRadius: 6 }]
    }, { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } });
};

// ==========================================
// REPORT: Score de Eficiência
// ==========================================
window.renderEfficiencyScore = function (data, canvas) {
    if (data.length === 0) return renderEmpty(canvas);

    let scores = [], buckets = { '0–25': 0, '26–50': 0, '51–75': 0, '76–100': 0 };

    data.forEach(row => {
        const s = row.classification_data.sales_metrics?.efficiency_score;
        if (typeof s === 'number') {
            scores.push(s);
            if (s <= 25) buckets['0–25']++;
            else if (s <= 50) buckets['26–50']++;
            else if (s <= 75) buckets['51–75']++;
            else buckets['76–100']++;
        }
    });

    if (scores.length === 0) return renderEmpty(canvas, "Score de Eficiência não encontrado.");

    const avg = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);

    canvas.innerHTML = `
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div class="report-card text-center col-span-1 sm:col-span-2">
                <p class="stat-label mb-2">Score Médio de Eficiência</p>
                <p class="stat-value ${avg >= 70 ? 'text-green-600' : avg >= 45 ? 'text-yellow-600' : 'text-red-600'}">${avg} <span class="text-gray-400 text-lg font-normal">/100</span></p>
            </div>
            <div class="report-card text-center">
                <p class="stat-label mb-2">Amostra</p>
                <p class="stat-value">${scores.length}</p>
            </div>
        </div>
        <div class="report-card">
            <h3 class="text-sm font-bold text-gray-800 uppercase mb-4">Distribuição de Eficiência</h3>
            <div style="height:280px; position:relative;"><canvas id="chart-eff-dist"></canvas></div>
        </div>
    `;

    createChartJS(document.getElementById('chart-eff-dist').getContext('2d'), 'bar', {
        labels: Object.keys(buckets),
        datasets: [{ data: Object.values(buckets), backgroundColor: ['#f43f5e', '#f59e0b', '#60a5fa', '#10b981'], borderRadius: 6 }]
    }, { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } });
};
