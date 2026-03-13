// ==========================================
// REPORT: Identificação de Falantes
// ==========================================

window.renderSpeakerInference = function (data, canvas) {
    if (data.length === 0) return renderEmpty(canvas);

    // Aggregate Data
    let totalSellerRatio = 0;
    let totalClientRatio = 0;
    let totalInterruptions = 0;
    let openQuestions = 0;
    let closedQuestions = 0;
    let validCount = 0;

    data.forEach(row => {
        const inf = row.classification_data.speaker_inference;
        if (inf && typeof inf.seller_talk_ratio === 'number') {
            totalSellerRatio += inf.seller_talk_ratio;
            totalClientRatio += inf.client_talk_ratio;
            totalInterruptions += (inf.interruptions_detected || 0);
            openQuestions += (inf.open_questions_by_seller || 0);
            closedQuestions += (inf.closed_questions_by_seller || 0);
            validCount++;
        }
    });

    if (validCount === 0) return renderEmpty(canvas, "Nenhum dado de falantes encontrado.");

    const avgSeller = (totalSellerRatio / validCount) * 100;
    const avgClient = (totalClientRatio / validCount) * 100;
    const avgInt = (totalInterruptions / validCount).toFixed(1);

    canvas.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <!-- KPIs -->
            <div class="report-card">
                <p class="stat-label mb-2">Média de Interrupções</p>
                <p class="stat-value text-red-600">${avgInt} <span class="text-sm text-gray-400 font-normal">por atendimento</span></p>
            </div>
            <div class="report-card">
                <p class="stat-label mb-2">Perguntas Abertas (Vendedor)</p>
                <p class="stat-value text-blue-600">${openQuestions}</p>
            </div>
            <div class="report-card">
                <p class="stat-label mb-2">Perguntas Fechadas (Vendedor)</p>
                <p class="stat-value text-gray-700">${closedQuestions}</p>
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="report-card">
                <h3 class="text-sm font-bold text-gray-800 mb-4 uppercase">Share of Voice (Monólogo vs Diálogo)</h3>
                <div class="h-64 relative">
                    <canvas id="chart-sov"></canvas>
                </div>
            </div>
            
            <div class="report-card bg-blue-50 border-blue-100 flex flex-col justify-center">
                <i data-lucide="message-circle" class="w-10 h-10 text-blue-500 mb-4"></i>
                <h3 class="text-lg font-bold text-gray-900 mb-2">Diagnóstico da Conversa</h3>
                <p class="text-gray-600 text-sm leading-relaxed mb-4">
                    O vendedor falou em média <b>${avgSeller.toFixed(0)}%</b> do tempo, comparado a <b>${avgClient.toFixed(0)}%</b> do cliente.
                    Historicamente, vendedores que falam mais de 60% do tempo tendem a não ouvir as dores do cliente (monólogo), despencando a conversão.
                </p>
                <div class="text-xs bg-white p-3 rounded border border-blue-200 text-blue-800">
                    Razão ideal: <b>40% Vendedor / 60% Cliente</b>.
                </div>
            </div>
        </div>
    `;

    // Render Chart
    const ctx = document.getElementById('chart-sov').getContext('2d');
    createChartJS(ctx, 'doughnut', {
        labels: ['Vendedor (Fala)', 'Cliente (Fala)'],
        datasets: [{
            data: [avgSeller, avgClient],
            backgroundColor: ['#3b82f6', '#10b981'],
            borderWidth: 0
        }]
    }, { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } });

    lucide.createIcons();
};

// ==========================================
// REPORT: Fases da Venda
// ==========================================

window.renderConversationPhases = function (data, canvas) {
    if (data.length === 0) return renderEmpty(canvas);

    let phaseTally = {};
    let totalDurs = {};
    let countDurs = {};

    data.forEach(row => {
        const cs = row.classification_data.conversation_structure;
        if (cs && cs.phases && Array.isArray(cs.phases)) {
            cs.phases.forEach(p => {
                const phaseName = translatePhase(p.phase);
                phaseTally[phaseName] = (phaseTally[phaseName] || 0) + 1;

                if (p.duration_estimate_seconds) {
                    totalDurs[phaseName] = (totalDurs[phaseName] || 0) + p.duration_estimate_seconds;
                    countDurs[phaseName] = (countDurs[phaseName] || 0) + 1;
                }
            });
        }
    });

    const labels = Object.keys(phaseTally);
    if (labels.length === 0) return renderEmpty(canvas, "Fases não cronometradas nestes áudios.");

    const freqs = labels.map(l => phaseTally[l]);
    const avgs = labels.map(l => {
        if (!countDurs[l]) return 0;
        return Math.floor(totalDurs[l] / countDurs[l]);
    });

    canvas.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div class="report-card">
                <h3 class="text-sm font-bold text-gray-800 mb-4 uppercase">Presença da Fase no Atendimento</h3>
                <p class="text-xs text-gray-500 mb-4">Quantas vezes o vendedor executou cada etapa obrigatória da venda.</p>
                <div class="h-64 relative">
                    <canvas id="chart-phases-freq"></canvas>
                </div>
            </div>
            
            <div class="report-card">
                <h3 class="text-sm font-bold text-gray-800 mb-4 uppercase">Duração Média por Fase (Segundos)</h3>
                <p class="text-xs text-gray-500 mb-4">Onde a operação gasta mais tempo?</p>
                <div class="h-64 relative">
                    <canvas id="chart-phases-time"></canvas>
                </div>
            </div>
        </div>
    `;

    createChartJS(document.getElementById('chart-phases-freq').getContext('2d'), 'bar', {
        labels: labels,
        datasets: [{ label: 'Qtd de Atendimentos', data: freqs, backgroundColor: '#8b5cf6', borderRadius: 4 }]
    }, { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } });

    createChartJS(document.getElementById('chart-phases-time').getContext('2d'), 'bar', {
        labels: labels,
        datasets: [{ label: 'Média de Tempo (s)', data: avgs, backgroundColor: '#ec4899', borderRadius: 4 }]
    }, { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } });

};

// Helper
function renderEmpty(canvas, msg = "Nenhum dado referente a esta métrica foi encontrado nos JSONs filtrados.") {
    canvas.innerHTML = `
        <div class="text-center py-20 bg-white border border-gray-200 rounded-xl">
            <i data-lucide="inbox" class="w-12 h-12 text-gray-300 mx-auto mb-4"></i>
            <h3 class="text-lg font-bold text-gray-600">Dados Insuficientes</h3>
            <p class="text-gray-500 mt-2 text-sm">${msg}</p>
        </div>
    `;
    lucide.createIcons();
}

function translatePhase(name) {
    const d = {
        'approach': 'Abordagem', 'probing': 'Sondagem', 'presentation': 'Apresentação',
        'negotiation': 'Negociação', 'closing': 'Fechamento', 'post_sale': 'Pós Venda',
        'unrelated': 'Assunto Aleatório', 'unknown': 'Desconhecido'
    };
    return d[name] || name;
}
