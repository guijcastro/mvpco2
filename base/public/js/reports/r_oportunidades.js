// ==========================================
// REPORT: Cross-Sell Ignorado
// ==========================================
window.renderCrossSell = function (data, canvas) {
    if (data.length === 0) return renderEmpty(canvas);

    let products = {}, totalLoss = 0;

    data.forEach(row => {
        const lo = row.classification_data.lost_opportunities;
        if (!lo) return;
        totalLoss += (lo.total_estimated_value_loss || 0);
        if (Array.isArray(lo.cross_sell_not_offered)) {
            lo.cross_sell_not_offered.forEach(item => {
                if (!item.product) return;
                products[item.product] = (products[item.product] || 0) + 1;
            });
        }
    });

    const labels = Object.keys(products).sort((a, b) => products[b] - products[a]);

    canvas.innerHTML = `
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div class="report-card col-span-1 sm:col-span-2 bg-red-50 border-red-200">
                <p class="stat-label mb-2 text-red-700">💰 Prejuízo Total Estimado (todos os áudios)</p>
                <p class="stat-value text-red-700">R$ ${totalLoss.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
            <div class="report-card text-center">
                <p class="stat-label mb-2">Produtos já identificados</p>
                <p class="stat-value">${labels.length}</p>
            </div>
        </div>
        <div class="report-card">
            <h3 class="text-sm font-bold text-gray-800 uppercase mb-4">Produtos de Cross-Sell Mais Ignorados</h3>
            ${labels.length === 0 ? '<p class="text-sm text-gray-400 italic">Nenhum cross-sell não ofertado registrado.</p>' : `<div style="height:300px; position:relative;"><canvas id="chart-crosssell"></canvas></div>`}
        </div>
    `;

    if (labels.length > 0) {
        createChartJS(document.getElementById('chart-crosssell').getContext('2d'), 'bar', {
            labels: labels.slice(0, 15),
            datasets: [{ label: 'Ocorrências', data: labels.slice(0, 15).map(l => products[l]), backgroundColor: '#f43f5e', borderRadius: 4 }]
        }, { responsive: true, maintainAspectRatio: false, indexAxis: 'y', scales: { x: { beginAtZero: true } } });
    }
};

// ==========================================
// REPORT: Upsell Ignorado
// ==========================================
window.renderUpSell = function (data, canvas) {
    if (data.length === 0) return renderEmpty(canvas);

    let offeredProducts = {}, totalDelta = 0;

    data.forEach(row => {
        const lo = row.classification_data.lost_opportunities;
        if (!lo || !Array.isArray(lo.upsell_not_offered)) return;
        lo.upsell_not_offered.forEach(item => {
            if (!item.product_offered) return;
            offeredProducts[item.product_offered] = (offeredProducts[item.product_offered] || 0) + 1;
            totalDelta += (item.estimated_delta_value || 0);
        });
    });

    const labels = Object.keys(offeredProducts).sort((a, b) => offeredProducts[b] - offeredProducts[a]);

    canvas.innerHTML = `
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div class="report-card bg-orange-50 border-orange-200">
                <p class="stat-label mb-2 text-orange-700">Diferença de Ticket Acumulada Perdida</p>
                <p class="stat-value text-orange-700">R$ ${totalDelta.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
            <div class="report-card text-center">
                <p class="stat-label mb-2">Produtos sem Versão Premium Sugerida</p>
                <p class="stat-value">${labels.length}</p>
            </div>
        </div>
        <div class="report-card">
            <h3 class="text-sm font-bold text-gray-800 uppercase mb-4">Produtos com Upsell Perdido</h3>
            ${labels.length === 0 ? '<p class="text-sm text-gray-400 italic">Nenhum upsell perdido registrado.</p>' : `<div style="height:280px; position:relative;"><canvas id="chart-upsell"></canvas></div>`}
        </div>
    `;

    if (labels.length > 0) {
        createChartJS(document.getElementById('chart-upsell').getContext('2d'), 'bar', {
            labels: labels.slice(0, 10),
            datasets: [{ label: 'Oportunidades Perdidas', data: labels.slice(0, 10).map(l => offeredProducts[l]), backgroundColor: '#f59e0b', borderRadius: 4 }]
        }, { responsive: true, maintainAspectRatio: false, indexAxis: 'y', scales: { x: { beginAtZero: true } } });
    }
};

// ==========================================
// REPORT: Necessidades Implícitas
// ==========================================
window.renderImplicitNeeds = function (data, canvas) {
    if (data.length === 0) return renderEmpty(canvas);

    let needs = {};

    data.forEach(row => {
        const lo = row.classification_data.lost_opportunities;
        if (!lo || !Array.isArray(lo.implicit_needs_not_addressed)) return;
        lo.implicit_needs_not_addressed.forEach(need => {
            needs[need] = (needs[need] || 0) + 1;
        });
    });

    const labels = Object.keys(needs).sort((a, b) => needs[b] - needs[a]).slice(0, 15);

    canvas.innerHTML = `
        <div class="report-card mb-6 bg-purple-50 border-purple-200">
            <h3 class="text-sm font-bold text-purple-800 mb-1">O que é este Relatório?</h3>
            <p class="text-sm text-purple-700">São dores que o cliente mencionou indiretamente na conversa, mas que o vendedor deixou passar sem transformar em oferta. Cada item aqui é uma venda potencial que saiu pela janela.</p>
        </div>
        <div class="report-card">
            <h3 class="text-sm font-bold text-gray-800 uppercase mb-4">Necessidades Implícitas Mais Recorrentes</h3>
            ${labels.length === 0 ? '<p class="text-sm text-gray-400 italic">Nenhuma necessidade implícita registrada.</p>' : `<div style="height:280px; position:relative;"><canvas id="chart-implicit"></canvas></div>`}
        </div>
    `;

    if (labels.length > 0) {
        createChartJS(document.getElementById('chart-implicit').getContext('2d'), 'bar', {
            labels, datasets: [{ label: 'Frequência', data: labels.map(l => needs[l]), backgroundColor: '#8b5cf6', borderRadius: 4 }]
        }, { responsive: true, maintainAspectRatio: false, indexAxis: 'y', scales: { x: { beginAtZero: true } } });
    }
};

// ==========================================
// REPORT: Gap de Produto (Pedido vs Apresentado)
// ==========================================
window.renderProductGap = function (data, canvas) {
    if (data.length === 0) return renderEmpty(canvas);

    let requested = {}, presented = {}, gap = {}, purchased = {};

    data.forEach(row => {
        const p = row.classification_data.products;
        if (!p) return;
        (p.requested_by_client || []).forEach(pr => { requested[pr] = (requested[pr] || 0) + 1; });
        (p.presented_by_seller || []).forEach(pr => { presented[pr] = (presented[pr] || 0) + 1; });
        (p.gap_requested_not_presented || []).forEach(pr => { gap[pr] = (gap[pr] || 0) + 1; });
        (p.purchased_or_agreed || []).forEach(pr => { purchased[pr] = (purchased[pr] || 0) + 1; });
    });

    const gapLabels = Object.keys(gap).sort((a, b) => gap[b] - gap[a]).slice(0, 10);

    canvas.innerHTML = `
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div class="report-card text-center"><p class="stat-label mb-1">Produtos Solicitados</p><p class="stat-value text-blue-600">${Object.values(requested).reduce((a, b) => a + b, 0)}</p></div>
            <div class="report-card text-center"><p class="stat-label mb-1">Apresentados</p><p class="stat-value text-green-600">${Object.values(presented).reduce((a, b) => a + b, 0)}</p></div>
            <div class="report-card text-center bg-red-50 border-red-200"><p class="stat-label mb-1 text-red-700">Gap (Pedidos – Não Apresent.)</p><p class="stat-value text-red-700">${Object.values(gap).reduce((a, b) => a + b, 0)}</p></div>
            <div class="report-card text-center bg-green-50 border-green-200"><p class="stat-label mb-1 text-green-700">Comprados / Acordados</p><p class="stat-value text-green-700">${Object.values(purchased).reduce((a, b) => a + b, 0)}</p></div>
        </div>
        <div class="report-card">
            <h3 class="text-sm font-bold text-gray-800 uppercase mb-4">Produtos Solicitados — Mas Nunca Apresentados</h3>
            ${gapLabels.length === 0 ? '<p class="text-sm text-gray-400 italic">Nenhum gap de produto detectado.</p>' : `<div style="height:280px; position:relative;"><canvas id="chart-product-gap"></canvas></div>`}
        </div>
    `;

    if (gapLabels.length > 0) {
        createChartJS(document.getElementById('chart-product-gap').getContext('2d'), 'bar', {
            labels: gapLabels, datasets: [{ label: 'Qtd Ignorado', data: gapLabels.map(l => gap[l]), backgroundColor: '#f43f5e', borderRadius: 4 }]
        }, { responsive: true, maintainAspectRatio: false, indexAxis: 'y', scales: { x: { beginAtZero: true } } });
    }
};
