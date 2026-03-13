// ==========================================
// REPORT: Perfil Demográfico
// ==========================================
window.renderDemographics = function (data, canvas) {
    if (data.length === 0) return renderEmpty(canvas);

    let ages = {}, genders = {}, classes = {}, powers = {};
    data.forEach(row => {
        const cp = row.classification_data.customer_profile;
        if (!cp) return;
        if (cp.inferred_age_range) ages[cp.inferred_age_range] = (ages[cp.inferred_age_range] || 0) + 1;
        if (cp.inferred_gender) { const gMap = { male: 'Masculino', female: 'Feminino', non_binary: 'Não Binário', uncertain: 'Incerto' }; const g = gMap[cp.inferred_gender] || cp.inferred_gender; genders[g] = (genders[g] || 0) + 1; }
        if (cp.inferred_socioeconomic_class) classes[cp.inferred_socioeconomic_class] = (classes[cp.inferred_socioeconomic_class] || 0) + 1;
        if (cp.estimated_purchasing_power) powers[cp.estimated_purchasing_power] = (powers[cp.estimated_purchasing_power] || 0) + 1;
    });

    canvas.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div class="report-card"><h3 class="text-sm font-bold uppercase mb-3">Faixa Etária</h3><div style="height:220px;position:relative;"><canvas id="chart-age"></canvas></div></div>
            <div class="report-card"><h3 class="text-sm font-bold uppercase mb-3">Gênero</h3><div style="height:220px;position:relative;"><canvas id="chart-gender"></canvas></div></div>
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="report-card"><h3 class="text-sm font-bold uppercase mb-3">Classe Socioeconômica</h3><div style="height:220px;position:relative;"><canvas id="chart-class"></canvas></div></div>
            <div class="report-card"><h3 class="text-sm font-bold uppercase mb-3">Poder de Compra Estimado</h3><div style="height:220px;position:relative;"><canvas id="chart-power"></canvas></div></div>
        </div>
    `;

    const makeChart = (id, d) => {
        const l = Object.keys(d); const vals = l.map(k => d[k]);
        createChartJS(document.getElementById(id).getContext('2d'), 'doughnut', {
            labels: l, datasets: [{ data: vals, backgroundColor: ChartColors.mixed, borderWidth: 0 }]
        }, { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } } } });
    };
    if (Object.keys(ages).length) makeChart('chart-age', ages);
    if (Object.keys(genders).length) makeChart('chart-gender', genders);
    if (Object.keys(classes).length) makeChart('chart-class', classes);
    if (Object.keys(powers).length) makeChart('chart-power', powers);
};

// ==========================================
// REPORT: Psicologia & Arquétipo
// ==========================================
window.renderPsychology = function (data, canvas) {
    if (data.length === 0) return renderEmpty(canvas);

    let archetypes = {}, decisions = {}, risks = {}, speeds = {}, trust = {};
    data.forEach(row => {
        const pp = row.classification_data.psychological_profile;
        if (!pp) return;
        const aMap = { rational: 'Racional', emotional: 'Emocional', social: 'Social', conservative: 'Conservador', uncertain: 'Incerto' };
        if (pp.archetype) { const a = aMap[pp.archetype] || pp.archetype; archetypes[a] = (archetypes[a] || 0) + 1; }
        if (pp.decision_style) decisions[pp.decision_style] = (decisions[pp.decision_style] || 0) + 1;
        if (pp.risk_profile) risks[pp.risk_profile] = (risks[pp.risk_profile] || 0) + 1;
        if (pp.trust_level_towards_seller) trust[pp.trust_level_towards_seller] = (trust[pp.trust_level_towards_seller] || 0) + 1;
    });

    canvas.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div class="report-card"><h3 class="text-sm font-bold uppercase mb-3">Arquétipo de Consumidor</h3><div style="height:220px;position:relative;"><canvas id="chart-arch"></canvas></div></div>
            <div class="report-card"><h3 class="text-sm font-bold uppercase mb-3">Estilo de Decisão</h3><div style="height:220px;position:relative;"><canvas id="chart-decision"></canvas></div></div>
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="report-card"><h3 class="text-sm font-bold uppercase mb-3">Perfil de Risco</h3><div style="height:180px;position:relative;"><canvas id="chart-risk"></canvas></div></div>
            <div class="report-card"><h3 class="text-sm font-bold uppercase mb-3">Confiança no Vendedor</h3><div style="height:180px;position:relative;"><canvas id="chart-trust"></canvas></div></div>
        </div>
    `;

    const makeChart = (id, d) => {
        const l = Object.keys(d);
        createChartJS(document.getElementById(id).getContext('2d'), 'doughnut', {
            labels: l, datasets: [{ data: l.map(k => d[k]), backgroundColor: ChartColors.mixed, borderWidth: 0 }]
        }, { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } } } });
    };
    if (Object.keys(archetypes).length) makeChart('chart-arch', archetypes);
    if (Object.keys(decisions).length) makeChart('chart-decision', decisions);
    if (Object.keys(risks).length) makeChart('chart-risk', risks);
    if (Object.keys(trust).length) makeChart('chart-trust', trust);
};

// ==========================================
// REPORT: Engajamento e Conhecimento
// ==========================================
window.renderEngagement = function (data, canvas) {
    if (data.length === 0) return renderEmpty(canvas);

    let engagements = {}, knowledge = {}, repurchase = 0;
    data.forEach(row => {
        const bt = row.classification_data.behavioral_trends;
        if (!bt) return;
        if (bt.client_engagement_level) { const m = { high: 'Alto', medium: 'Médio', low: 'Baixo' }; const e = m[bt.client_engagement_level] || bt.client_engagement_level; engagements[e] = (engagements[e] || 0) + 1; }
        if (bt.client_knowledge_level) { const m = { expert: 'Especialista', intermediate: 'Intermediário', novice: 'Iniciante' }; const k = m[bt.client_knowledge_level] || bt.client_knowledge_level; knowledge[k] = (knowledge[k] || 0) + 1; }
        if (bt.repurchase_signal) repurchase++;
    });

    canvas.innerHTML = `
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div class="report-card text-center bg-green-50 border-green-200">
                <p class="stat-label text-green-700 mb-2">Sinais de Recompra Detectados</p>
                <p class="stat-value text-green-700">${repurchase}</p>
            </div>
            <div class="report-card col-span-2"><h3 class="text-sm font-bold uppercase mb-3">Nível de Engajamento do Cliente</h3><div style="height:150px;position:relative;"><canvas id="chart-eng"></canvas></div></div>
        </div>
        <div class="report-card">
            <h3 class="text-sm font-bold uppercase mb-3">Nível de Conhecimento Prévio do Produto</h3>
            <div style="height:220px;position:relative;"><canvas id="chart-know"></canvas></div>
        </div>
    `;

    const eKeys = Object.keys(engagements);
    if (eKeys.length) createChartJS(document.getElementById('chart-eng').getContext('2d'), 'bar', {
        labels: eKeys, datasets: [{ data: eKeys.map(k => engagements[k]), backgroundColor: ['#10b981', '#f59e0b', '#f43f5e'], borderRadius: 4 }]
    }, { responsive: true, maintainAspectRatio: false, indexAxis: 'x', plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } });

    const kKeys = Object.keys(knowledge);
    if (kKeys.length) createChartJS(document.getElementById('chart-know').getContext('2d'), 'doughnut', {
        labels: kKeys, datasets: [{ data: kKeys.map(k => knowledge[k]), backgroundColor: ['#8b5cf6', '#3b82f6', '#94a3b8'], borderWidth: 0 }]
    }, { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } });
};

// ==========================================
// REPORT: Perfil de Consumo
// ==========================================
window.renderConsumption = function (data, canvas) {
    if (data.length === 0) return renderEmpty(canvas);

    let priceSensitivity = {}, purchaseType = {}, comStyle = {};
    data.forEach(row => {
        const cp = row.classification_data.customer_profile;
        if (!cp) return;
        if (cp.price_sensitivity) { const m = { high: 'Alta', medium: 'Média', low: 'Baixa', uncertain: 'Incerto' }; const p = m[cp.price_sensitivity] || cp.price_sensitivity; priceSensitivity[p] = (priceSensitivity[p] || 0) + 1; }
        if (cp.purchase_type) { const m = { new_customer: 'Novo Cliente', returning_customer: 'Cliente Recorrente', uncertain: 'Incerto' }; const pt = m[cp.purchase_type] || cp.purchase_type; purchaseType[pt] = (purchaseType[pt] || 0) + 1; }
        if (cp.preferred_communication_style) comStyle[cp.preferred_communication_style] = (comStyle[cp.preferred_communication_style] || 0) + 1;
    });

    canvas.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div class="report-card"><h3 class="text-sm font-bold uppercase mb-3">Sensibilidade a Preço</h3><div style="height:220px;position:relative;"><canvas id="chart-price-sens"></canvas></div></div>
            <div class="report-card"><h3 class="text-sm font-bold uppercase mb-3">Novo vs Recorrente</h3><div style="height:220px;position:relative;"><canvas id="chart-purch-type"></canvas></div></div>
            <div class="report-card"><h3 class="text-sm font-bold uppercase mb-3">Estilo de Comunicação</h3><div style="height:220px;position:relative;"><canvas id="chart-com-style"></canvas></div></div>
        </div>
    `;

    const makeDonut = (id, d) => { const l = Object.keys(d); createChartJS(document.getElementById(id).getContext('2d'), 'doughnut', { labels: l, datasets: [{ data: l.map(k => d[k]), backgroundColor: ChartColors.mixed, borderWidth: 0 }] }, { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } } } }); };
    if (Object.keys(priceSensitivity).length) makeDonut('chart-price-sens', priceSensitivity);
    if (Object.keys(purchaseType).length) makeDonut('chart-purch-type', purchaseType);
    if (Object.keys(comStyle).length) makeDonut('chart-com-style', comStyle);
};
