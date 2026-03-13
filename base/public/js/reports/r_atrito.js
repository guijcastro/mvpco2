// ==========================================
// REPORT: Momentos Críticos
// ==========================================
window.renderCriticalMoments = function (data, canvas) {
    if (data.length === 0) return renderEmpty(canvas);

    let momentsTally = {};
    const momentMap = {
        turning_point_positive: '🟢 Virada Positiva', turning_point_negative: '🔴 Virada Negativa',
        main_objection: '⚡ Objeção Principal', decision_moment: '🎯 Momento de Decisão',
        peak_engagement: '🔺 Pico de Engajamento', disengagement: '🔻 Desengajamento',
        sale_lost_moment: '💀 Perda da Venda'
    };

    data.forEach(row => {
        const cm = row.classification_data.critical_moments;
        if (!Array.isArray(cm)) return;
        cm.forEach(m => {
            const label = momentMap[m.moment_type] || m.moment_type;
            momentsTally[label] = (momentsTally[label] || 0) + 1;
        });
    });

    const labels = Object.keys(momentsTally).sort((a, b) => momentsTally[b] - momentsTally[a]);
    if (labels.length === 0) return renderEmpty(canvas, "Nenhum momento crítico identificado.");

    canvas.innerHTML = `
        <div class="report-card mb-6">
            <h3 class="text-sm font-bold uppercase mb-4">Mapa de Momentos Críticos da Conversa</h3>
            <p class="text-xs text-gray-500 mb-6">Quais arquétipos de virada acontecem com mais frequência durante os atendimentos.</p>
            <div style="height:320px;position:relative;"><canvas id="chart-moments"></canvas></div>
        </div>
    `;
    const bgColors = labels.map(l => {
        if (l.includes('Positiva') || l.includes('Engajamento')) return '#10b981';
        if (l.includes('Negativa') || l.includes('Perda') || l.includes('Desengajamento')) return '#f43f5e';
        if (l.includes('Decisão')) return '#3b82f6';
        if (l.includes('Objeção')) return '#f59e0b';
        return '#94a3b8';
    });
    createChartJS(document.getElementById('chart-moments').getContext('2d'), 'bar', {
        labels, datasets: [{ label: 'Ocorrências', data: labels.map(l => momentsTally[l]), backgroundColor: bgColors, borderRadius: 4 }]
    }, { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true } } });
};

// ==========================================
// REPORT: Matriz de Objeções
// ==========================================
window.renderObjections = function (data, canvas) {
    if (data.length === 0) return renderEmpty(canvas);

    let objTypes = {}, resolvedCount = 0, totalCount = 0;
    let objectionsRaw = [];

    data.forEach(row => {
        const objs = row.classification_data.objections;
        if (!Array.isArray(objs)) return;
        objs.forEach(obj => {
            totalCount++;
            if (obj.objection_resolved) resolvedCount++;
            const t = obj.objection_type || 'outros';
            objTypes[t] = (objTypes[t] || 0) + 1;
            objectionsRaw.push(obj);
        });
    });

    if (totalCount === 0) return renderEmpty(canvas, "Nenhuma objeção registrada.");
    const resolveRate = ((resolvedCount / totalCount) * 100).toFixed(1);

    const rowsHtml = objectionsRaw.slice(0, 15).map(obj => {
        const effectIcon = { effective: '✅', partial: '⚠️', ineffective: '❌', no_response: '🚫' };
        return `<tr class="border-b border-gray-100 hover:bg-gray-50">
            <td class="py-3 pr-4"><span class="text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full font-semibold">${obj.objection_type}</span></td>
            <td class="py-3 pr-4 text-sm text-gray-700 max-w-xs truncate italic">"${obj.verbatim_or_paraphrase}"</td>
            <td class="py-3 text-center text-lg">${obj.objection_resolved ? '✅' : '❌'}</td>
            <td class="py-3 text-center text-sm">${effectIcon[obj.response_effectiveness] || '-'} ${obj.response_effectiveness || '-'}</td>
        </tr>`;
    }).join('');

    canvas.innerHTML = `
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div class="report-card text-center"><p class="stat-label mb-2">Objeções Levantadas</p><p class="stat-value">${totalCount}</p></div>
            <div class="report-card text-center"><p class="stat-label mb-2">Taxa de Resolução</p><p class="stat-value ${resolveRate >= 60 ? 'text-green-600' : 'text-red-600'}">${resolveRate}%</p></div>
            <div class="report-card"><h3 class="text-sm font-bold uppercase mb-3">Tipos de Objeção</h3><div style="height:110px;position:relative;"><canvas id="chart-obj-types"></canvas></div></div>
        </div>
        <div class="report-card">
            <h3 class="text-sm font-bold uppercase mb-4">Detalhe de Cada Objeção</h3>
            <table class="w-full">
                <thead><tr class="border-b-2 border-gray-200 text-left">
                    <th class="text-xs font-bold text-gray-500 uppercase py-2 pr-4">Tipo</th>
                    <th class="text-xs font-bold text-gray-500 uppercase py-2 pr-4">Frase do Cliente</th>
                    <th class="text-xs font-bold text-gray-500 uppercase py-2 text-center">Resolvida</th>
                    <th class="text-xs font-bold text-gray-500 uppercase py-2 text-center">Eficácia da Referência</th>
                </tr></thead>
                <tbody>${rowsHtml}</tbody>
            </table>
        </div>
    `;

    const tLabels = Object.keys(objTypes);
    createChartJS(document.getElementById('chart-obj-types').getContext('2d'), 'doughnut', {
        labels: tLabels, datasets: [{ data: tLabels.map(l => objTypes[l]), backgroundColor: ChartColors.mixed, borderWidth: 0 }]
    }, { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { font: { size: 10 } } } } });
};

// ==========================================
// REPORT: Críticas Veladas
// ==========================================
window.renderHiddenCriticisms = function (data, canvas) {
    if (data.length === 0) return renderEmpty(canvas);

    let typesTally = {}, severities = {};
    let rawCriticisms = [];
    const typeMap = {
        indirect_negative_language: 'Linguagem Indireta Negativa', sarcasm: 'Sarcasmo', unfavorable_comparison: 'Comparação Desfavorável',
        polite_excuse: 'Desculpa Educada', discomfort_signal: 'Sinal de Desconforto', meaningful_silence: 'Silêncio Significativo',
        tone_shift: 'Mudança de Tom', evasive_response: 'Resposta Evasiva'
    };

    data.forEach(row => {
        const hc = row.classification_data.hidden_criticisms;
        if (!Array.isArray(hc)) return;
        hc.forEach(c => {
            const label = typeMap[c.type] || c.type;
            typesTally[label] = (typesTally[label] || 0) + 1;
            severities[c.severity] = (severities[c.severity] || 0) + 1;
            rawCriticisms.push(c);
        });
    });

    if (rawCriticisms.length === 0) return renderEmpty(canvas, "Nenhuma crítica velada detectada nos atendimentos. Ótimo sinal!");

    const severityColors = { high: 'text-red-700 bg-red-100', medium: 'text-orange-700 bg-orange-100', low: 'text-yellow-700 bg-yellow-100' };

    const evidences = rawCriticisms.filter(c => c.severity === 'high').slice(0, 6);
    const evidenceHtml = evidences.map(c => `
        <div class="border rounded-xl p-4 ${severityColors[c.severity] || 'bg-gray-50'}">
            <div class="flex justify-between items-center mb-2">
                <span class="text-xs font-bold uppercase">${typeMap[c.type] || c.type}</span>
                <span class="text-xs font-semibold px-2 py-0.5 rounded-full ${severityColors[c.severity]}">${c.severity.toUpperCase()}</span>
            </div>
            <p class="text-sm italic">"${c.evidence}"</p>
        </div>
    `).join('');

    canvas.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div class="report-card">
                <h3 class="text-sm font-bold uppercase mb-4">Tipos de Crítica Velada Detectados</h3>
                <div style="height:240px;position:relative;"><canvas id="chart-hc-types"></canvas></div>
            </div>
            <div class="report-card">
                <h3 class="text-sm font-bold uppercase mb-4">Distribuição por Severidade</h3>
                <div style="height:240px;position:relative;"><canvas id="chart-hc-sev"></canvas></div>
            </div>
        </div>
        <div class="report-card">
            <h3 class="text-sm font-bold text-red-800 uppercase mb-4">🚨 Alertas de Alta Severidade</h3>
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">${evidenceHtml || '<p class="text-gray-400 text-sm">Nenhum alerta de alta severidade.</p>'}</div>
        </div>
    `;

    const tLabels = Object.keys(typesTally);
    createChartJS(document.getElementById('chart-hc-types').getContext('2d'), 'bar', {
        labels: tLabels, datasets: [{ data: tLabels.map(l => typesTally[l]), backgroundColor: '#8b5cf6', borderRadius: 4 }]
    }, { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true } } });

    const sKeys = Object.keys(severities);
    createChartJS(document.getElementById('chart-hc-sev').getContext('2d'), 'doughnut', {
        labels: sKeys, datasets: [{ data: sKeys.map(k => severities[k]), backgroundColor: ['#f43f5e', '#f59e0b', '#22c55e'], borderWidth: 0 }]
    }, { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } });
};

// ==========================================
// REPORT: Concorrência
// ==========================================
window.renderCompetitors = function (data, canvas) {
    if (data.length === 0) return renderEmpty(canvas);

    let competitors = {}, directions = {}, risks = {};
    const dirMap = { favorable_to_us: 'Favorável a Nós ✅', unfavorable_to_us: 'Desfavorável ❌', neutral: 'Neutro ⚪' };
    const riskMap = { high: 'Alto Risco', medium: 'Médio Risco', low: 'Baixo Risco', none: 'Sem Risco' };

    data.forEach(row => {
        const ca = row.classification_data.competitive_analysis;
        if (!ca) return;
        (ca.competitors_mentioned || []).forEach(c => { competitors[c] = (competitors[c] || 0) + 1; });
        (ca.competitor_comparisons || []).forEach(comp => {
            const dl = dirMap[comp.comparison_direction] || comp.comparison_direction;
            directions[dl] = (directions[dl] || 0) + 1;
        });
        const r = ca.loss_to_competitor_risk;
        if (r) { const rl = riskMap[r] || r; risks[rl] = (risks[rl] || 0) + 1; }
    });

    const compLabels = Object.keys(competitors).sort((a, b) => competitors[b] - competitors[a]).slice(0, 10);
    const dirLabels = Object.keys(directions);
    const riskLabels = Object.keys(risks);

    canvas.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div class="report-card col-span-2">
                <h3 class="text-sm font-bold uppercase mb-4">Concorrentes Mais Citados</h3>
                ${compLabels.length === 0 ? '<p class="text-gray-400 text-sm italic">Nenhum concorrente mencionado.</p>' : `<div style="height:230px;position:relative;"><canvas id="chart-comp-names"></canvas></div>`}
            </div>
            <div class="report-card">
                <h3 class="text-sm font-bold uppercase mb-4">Risco de Perda</h3>
                ${riskLabels.length === 0 ? '<p class="text-gray-400 text-sm italic">Sem dados.</p>' : `<div style="height:230px;position:relative;"><canvas id="chart-comp-risk"></canvas></div>`}
            </div>
        </div>
        <div class="report-card">
            <h3 class="text-sm font-bold uppercase mb-4">Direção das Comparações com Concorrentes</h3>
            ${dirLabels.length === 0 ? '<p class="text-gray-400 text-sm italic">Sem comparações diretas.</p>' : `<div style="height:200px;position:relative;"><canvas id="chart-comp-dir"></canvas></div>`}
        </div>
    `;
    if (compLabels.length) createChartJS(document.getElementById('chart-comp-names').getContext('2d'), 'bar', {
        labels: compLabels, datasets: [{ data: compLabels.map(l => competitors[l]), backgroundColor: '#0ea5e9', borderRadius: 4 }]
    }, { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true } } });

    if (riskLabels.length) createChartJS(document.getElementById('chart-comp-risk').getContext('2d'), 'doughnut', {
        labels: riskLabels, datasets: [{ data: riskLabels.map(l => risks[l]), backgroundColor: ['#f43f5e', '#f59e0b', '#10b981', '#94a3b8'], borderWidth: 0 }]
    }, { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } } } });

    if (dirLabels.length) createChartJS(document.getElementById('chart-comp-dir').getContext('2d'), 'bar', {
        labels: dirLabels, datasets: [{ data: dirLabels.map(l => directions[l]), backgroundColor: ['#10b981', '#f43f5e', '#94a3b8'], borderRadius: 4 }]
    }, { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } });
};
