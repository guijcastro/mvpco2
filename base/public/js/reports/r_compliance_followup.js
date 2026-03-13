// ==========================================
// REPORT: Postura & Empatia do Vendedor
// ==========================================
window.renderEmpathy = function (data, canvas) {
    if (data.length === 0) return renderEmpty(canvas);

    let empathyCount = 0, listeningCount = 0, complexity = {}, jargon = {};
    let personalizationScores = [];

    data.forEach(row => {
        const ca = row.classification_data.communication_analysis;
        if (!ca) return;
        if (ca.empathy_demonstrated) empathyCount++;
        if (ca.active_listening_signals) listeningCount++;
        if (ca.language_complexity) { const m = { technical: 'Técnica', balanced: 'Balanceada', simple: 'Simples' }; const c = m[ca.language_complexity] || ca.language_complexity; complexity[c] = (complexity[c] || 0) + 1; }
        if (ca.jargon_usage) { const m = { high: 'Alto', medium: 'Médio', low: 'Baixo' }; const j = m[ca.jargon_usage] || ca.jargon_usage; jargon[j] = (jargon[j] || 0) + 1; }
        if (typeof ca.personalization_score === 'number') personalizationScores.push(ca.personalization_score);
    });

    const total = data.length;
    const empRate = ((empathyCount / total) * 100).toFixed(0);
    const listenRate = ((listeningCount / total) * 100).toFixed(0);
    const avgPersonalization = personalizationScores.length > 0 ? (personalizationScores.reduce((a, b) => a + b, 0) / personalizationScores.length).toFixed(1) : 'N/A';

    canvas.innerHTML = `
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div class="report-card text-center ${empRate >= 70 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}">
                <p class="stat-label mb-1">Empatia Demonstrada</p>
                <p class="stat-value ${empRate >= 70 ? 'text-green-600' : 'text-red-600'}">${empRate}%</p>
                <p class="text-xs text-gray-500 mt-1">${empathyCount} de ${total} atendimentos</p>
            </div>
            <div class="report-card text-center ${listenRate >= 70 ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}">
                <p class="stat-label mb-1">Escuta Ativa (Espelhamento)</p>
                <p class="stat-value ${listenRate >= 70 ? 'text-green-600' : 'text-yellow-600'}">${listenRate}%</p>
            </div>
            <div class="report-card text-center">
                <p class="stat-label mb-1">Personalização Média</p>
                <p class="stat-value text-blue-700">${avgPersonalization} <span class="text-sm font-normal text-gray-500">/100</span></p>
            </div>
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="report-card"><h3 class="text-sm font-bold uppercase mb-4">Complexidade da Linguagem</h3><div style="height:220px;position:relative;"><canvas id="chart-complexity"></canvas></div></div>
            <div class="report-card"><h3 class="text-sm font-bold uppercase mb-4">Uso de Jargão Técnico</h3><div style="height:220px;position:relative;"><canvas id="chart-jargon"></canvas></div></div>
        </div>
    `;

    const makeDonut = (id, d, colors) => { const l = Object.keys(d); createChartJS(document.getElementById(id).getContext('2d'), 'doughnut', { labels: l, datasets: [{ data: l.map(k => d[k]), backgroundColor: colors || ChartColors.mixed, borderWidth: 0 }] }, { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }); };
    if (Object.keys(complexity).length) makeDonut('chart-complexity', complexity, ['#8b5cf6', '#3b82f6', '#94a3b8']);
    if (Object.keys(jargon).length) makeDonut('chart-jargon', jargon, ['#f43f5e', '#f59e0b', '#10b981']);
};

// ==========================================
// REPORT: Técnicas de Venda
// ==========================================
window.renderSalesTechniques = function (data, canvas) {
    if (data.length === 0) return renderEmpty(canvas);

    let techniques = {};
    data.forEach(row => {
        const ca = row.classification_data.communication_analysis;
        if (!Array.isArray(ca?.sales_techniques_detected)) return;
        ca.sales_techniques_detected.forEach(t => { techniques[t] = (techniques[t] || 0) + 1; });
    });

    const labels = Object.keys(techniques).sort((a, b) => techniques[b] - techniques[a]);
    if (labels.length === 0) return renderEmpty(canvas, "Nenhuma técnica de venda formal detectada (SPIN, Escassez, etc).");

    canvas.innerHTML = `
        <div class="report-card">
            <h3 class="text-sm font-bold uppercase mb-2">Técnicas de Persuasão Identificadas pela IA</h3>
            <p class="text-xs text-gray-500 mb-5">Frequência com que cada técnica aparece na base de conversas analisadas.</p>
            <div style="height:350px;position:relative;"><canvas id="chart-techniques"></canvas></div>
        </div>
    `;
    createChartJS(document.getElementById('chart-techniques').getContext('2d'), 'bar', {
        labels, datasets: [{ data: labels.map(l => techniques[l]), backgroundColor: ChartColors.mixed, borderRadius: 4 }]
    }, { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true } } });
};

// ==========================================
// REPORT: Riscos de Compliance
// ==========================================
window.renderComplianceRisks = function (data, canvas) {
    if (data.length === 0) return renderEmpty(canvas);

    let abusiveCount = 0, promiseCount = 0, alertsList = [];
    data.forEach(row => {
        const c = row.classification_data.compliance;
        if (!c) return;
        if (c.abusive_practice_detected) { abusiveCount++; if (c.abusive_practice_description) alertsList.push({ type: 'Prática Abusiva', desc: c.abusive_practice_description, color: 'red' }); }
        if (c.unfulfillable_promise_detected) { promiseCount++; if (c.unfulfillable_promise_description) alertsList.push({ type: 'Promessa Incongruente', desc: c.unfulfillable_promise_description, color: 'orange' }); }
        (c.compliance_alerts || []).forEach(a => alertsList.push({ type: 'Alerta', desc: a, color: 'yellow' }));
    });

    const alertsHtml = alertsList.slice(0, 10).map(a => `
        <div class="border-l-4 ${a.color === 'red' ? 'border-red-500 bg-red-50' : a.color === 'orange' ? 'border-orange-500 bg-orange-50' : 'border-yellow-500 bg-yellow-50'} rounded-r-xl p-4">
            <p class="text-xs font-bold uppercase ${a.color === 'red' ? 'text-red-700' : a.color === 'orange' ? 'text-orange-700' : 'text-yellow-700'} mb-1">${a.type}</p>
            <p class="text-sm text-gray-700">${a.desc}</p>
        </div>
    `).join('');

    canvas.innerHTML = `
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div class="report-card ${abusiveCount > 0 ? 'bg-red-50 border-red-300' : 'bg-green-50 border-green-200'}">
                <p class="stat-label mb-2 ${abusiveCount > 0 ? 'text-red-700' : 'text-green-700'}">⚠️ Práticas Abusivas Detectadas</p>
                <p class="stat-value ${abusiveCount > 0 ? 'text-red-700' : 'text-green-600'}">${abusiveCount}</p>
            </div>
            <div class="report-card ${promiseCount > 0 ? 'bg-orange-50 border-orange-300' : 'bg-green-50 border-green-200'}">
                <p class="stat-label mb-2">Promessas Incongruentes</p>
                <p class="stat-value ${promiseCount > 0 ? 'text-orange-700' : 'text-green-600'}">${promiseCount}</p>
            </div>
        </div>
        <div class="report-card">
            <h3 class="text-sm font-bold uppercase mb-4">Log de Alertas de Compliance</h3>
            <div class="flex flex-col gap-3">${alertsHtml || '<p class="text-green-700 font-semibold text-sm">✅ Nenhum alerta crítico de compliance detectado.</p>'}</div>
        </div>
    `;
};

// ==========================================
// REPORT: Garantia & Direitos do Consumidor
// ==========================================
window.renderComplianceTerms = function (data, canvas) {
    if (data.length === 0) return renderEmpty(canvas);

    let warrantyCount = 0, rightsCount = 0, scriptCount = 0, scores = [];
    data.forEach(row => {
        const c = row.classification_data.compliance;
        if (!c) return;
        if (c.warranty_mentioned) warrantyCount++;
        if (c.consumer_rights_mentioned) rightsCount++;
        if (c.mandatory_script_followed) scriptCount++;
        if (typeof c.compliance_score === 'number') scores.push(c.compliance_score);
    });

    const total = data.length;
    const avgScore = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : 'N/A';

    const stat = (label, value, total, positive) => {
        const rate = ((value / total) * 100).toFixed(0);
        const ok = parseInt(rate) >= 60;
        return `<div class="report-card text-center ${ok ? '' : 'bg-red-50 border-red-200'}">
            <p class="stat-label mb-1">${label}</p>
            <p class="stat-value ${ok ? 'text-green-600' : 'text-red-600'}">${rate}% ${ok ? '✅' : '⚠️'}</p>
            <p class="text-xs text-gray-400 mt-1">${value} de ${total}</p>
        </div>`;
    };

    canvas.innerHTML = `
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            ${stat('Garantia Mencionada', warrantyCount, total)}
            ${stat('Direitos do Consumidor', rightsCount, total)}
            ${stat('Script Obrigatório Seguido', scriptCount, total)}
            <div class="report-card text-center"><p class="stat-label mb-1">Score Médio de Compliance</p><p class="stat-value text-blue-700">${avgScore}</p></div>
        </div>
    `;
};

// ==========================================
// REPORT: Follow-up e Captura de Contato
// ==========================================
window.renderFollowUp = function (data, canvas) {
    if (data.length === 0) return renderEmpty(canvas);

    let contactCount = 0, promisedCount = 0, contactTypes = {}, timings = {};

    data.forEach(row => {
        const fu = row.classification_data.follow_up;
        if (!fu) return;
        if (fu.contact_info_collected) contactCount++;
        if (fu.follow_up_promised) promisedCount++;
        if (fu.contact_type_collected && fu.contact_type_collected !== 'none') {
            const m = { phone: 'Telefone', email: 'E-mail', whatsapp: 'WhatsApp', multiple: 'Múltiplos', none: 'Não Coletado' };
            const t = m[fu.contact_type_collected] || fu.contact_type_collected;
            contactTypes[t] = (contactTypes[t] || 0) + 1;
        }
        if (fu.follow_up_timeframe_mentioned) timings[fu.follow_up_timeframe_mentioned] = (timings[fu.follow_up_timeframe_mentioned] || 0) + 1;
    });

    const total = data.length;
    const contactRate = ((contactCount / total) * 100).toFixed(0);
    const promRate = ((promisedCount / total) * 100).toFixed(0);

    canvas.innerHTML = `
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div class="report-card text-center ${contactRate >= 50 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}">
                <p class="stat-label mb-1">Contato Coletado</p>
                <p class="stat-value ${contactRate >= 50 ? 'text-green-600' : 'text-red-600'}">${contactRate}% (${contactCount})</p>
            </div>
            <div class="report-card text-center ${promRate >= 50 ? 'bg-blue-50 border-blue-200' : 'bg-yellow-50 border-yellow-200'}">
                <p class="stat-label mb-1">Com Promessa de Retorno</p>
                <p class="stat-value ${promRate >= 50 ? 'text-blue-700' : 'text-yellow-600'}">${promRate}% (${promisedCount})</p>
            </div>
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="report-card"><h3 class="text-sm font-bold uppercase mb-4">Tipo de Contato Coletado</h3>
                ${Object.keys(contactTypes).length === 0 ? '<p class="text-sm text-gray-400">Sem dados.</p>' : `<div style="height:220px;position:relative;"><canvas id="chart-contact-type"></canvas></div>`}
            </div>
            <div class="report-card"><h3 class="text-sm font-bold uppercase mb-4">Prazo de Follow-up Prometido</h3>
                ${Object.keys(timings).length === 0 ? '<p class="text-sm text-gray-400">Sem dados de prazo.</p>' : `<div style="height:220px;position:relative;"><canvas id="chart-followup-timing"></canvas></div>`}
            </div>
        </div>
    `;

    if (Object.keys(contactTypes).length) {
        const l = Object.keys(contactTypes);
        createChartJS(document.getElementById('chart-contact-type').getContext('2d'), 'doughnut', { labels: l, datasets: [{ data: l.map(k => contactTypes[k]), backgroundColor: ChartColors.mixed, borderWidth: 0 }] }, { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } });
    }
    if (Object.keys(timings).length) {
        const l = Object.keys(timings);
        createChartJS(document.getElementById('chart-followup-timing').getContext('2d'), 'bar', { labels: l, datasets: [{ data: l.map(k => timings[k]), backgroundColor: '#3b82f6', borderRadius: 4 }] }, { responsive: true, maintainAspectRatio: false, indexAxis: 'y', scales: { x: { beginAtZero: true } } });
    }
};
