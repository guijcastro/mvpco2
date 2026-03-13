// ==========================================
// REPORT: Avaliação do Checklist (QA)
// ==========================================
window.renderQAChecklist = function (data, canvas) {
    if (data.length === 0) return renderEmpty(canvas);

    let totalScore = 0, count = 0;
    let passCount = 0, failCount = 0, partialCount = 0, uncertainCount = 0;
    let itemsMap = {}; // { item_label: { pass:0, fail:0, partial:0 } }

    data.forEach(row => {
        const ck = row.classification_data.checklist;
        if (!ck) return;
        totalScore += (ck.total_score || 0);
        passCount += (ck.items_passed || 0);
        failCount += (ck.items_failed || 0);
        partialCount += 0;
        uncertainCount += (ck.items_uncertain || 0);
        count++;

        // Aggregate item-level data
        if (Array.isArray(ck.items)) {
            ck.items.forEach(item => {
                if (!item.item_label) return;
                if (!itemsMap[item.item_label]) itemsMap[item.item_label] = { pass: 0, fail: 0, partial: 0, not_applicable: 0 };
                itemsMap[item.item_label][item.result] = (itemsMap[item.item_label][item.result] || 0) + 1;
            });
        }
    });

    if (count === 0) return renderEmpty(canvas, "Nenhum checklist encontrado.");

    const avgScore = (totalScore / count).toFixed(1);
    const scoreColor = avgScore >= 80 ? 'text-green-600' : avgScore >= 60 ? 'text-yellow-600' : 'text-red-600';
    const scoreBg = avgScore >= 80 ? 'bg-green-50 border-green-200' : avgScore >= 60 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200';

    const rowsHtml = Object.entries(itemsMap).map(([label, counts]) => {
        const total = (counts.pass || 0) + (counts.fail || 0) + (counts.partial || 0) + (counts.not_applicable || 0);
        const passRate = total > 0 ? Math.round((counts.pass / total) * 100) : 0;
        const barColor = passRate >= 80 ? 'bg-green-500' : passRate >= 50 ? 'bg-yellow-500' : 'bg-red-500';
        return `<tr class="border-b border-gray-100 hover:bg-gray-50">
            <td class="py-3 pr-6 text-sm text-gray-700 font-medium">${label}</td>
            <td class="py-3 text-center"><span class="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">${counts.pass || 0}</span></td>
            <td class="py-3 text-center"><span class="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full">${counts.fail || 0}</span></td>
            <td class="py-3 text-center"><span class="text-xs bg-gray-100 text-gray-800 px-2 py-0.5 rounded-full">${counts.not_applicable || 0}</span></td>
            <td class="py-3 w-32">
                <div class="flex items-center gap-2">
                    <div class="flex-1 bg-gray-200 rounded-full h-2">
                        <div class="${barColor} h-2 rounded-full" style="width:${passRate}%"></div>
                    </div>
                    <span class="text-xs font-bold w-8 text-right">${passRate}%</span>
                </div>
            </td>
        </tr>`;
    }).join('');

    canvas.innerHTML = `
        <div class="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
            <div class="report-card ${scoreBg} col-span-1 sm:col-span-2 flex items-center gap-6">
                <div>
                    <p class="stat-label mb-1">Nota Média de Qualidade</p>
                    <p class="stat-value ${scoreColor}">${avgScore} <span class="text-lg text-gray-400">/100</span></p>
                    <p class="text-xs text-gray-500 mt-1">Com base em ${count} atendimentos</p>
                </div>
            </div>
            <div class="report-card text-center">
                <p class="stat-label mb-2">✅ Aprovados</p>
                <p class="stat-value text-green-600">${passCount}</p>
            </div>
            <div class="report-card text-center">
                <p class="stat-label mb-2">❌ Reprovados</p>
                <p class="stat-value text-red-600">${failCount}</p>
            </div>
        </div>

        <div class="report-card">
            <h3 class="text-sm font-bold text-gray-800 uppercase mb-1">Breakdown por Item do Checklist</h3>
            <p class="text-xs text-gray-500 mb-5">Taxa de compliance por critério de qualidade avaliado.</p>
            <table class="w-full">
                <thead>
                    <tr class="border-b-2 border-gray-200 text-left">
                        <th class="text-xs font-bold text-gray-500 uppercase py-2 pr-6">Critério</th>
                        <th class="text-xs font-bold text-green-700 uppercase py-2 text-center">OK</th>
                        <th class="text-xs font-bold text-red-700 uppercase py-2 text-center">Reprov.</th>
                        <th class="text-xs font-bold text-gray-500 uppercase py-2 text-center">N/A</th>
                        <th class="text-xs font-bold text-gray-500 uppercase py-2">Taxa de OK</th>
                    </tr>
                </thead>
                <tbody>${rowsHtml}</tbody>
            </table>
        </div>`;
};

// ==========================================
// REPORT: Heatmap Emocional
// ==========================================
window.renderHeatmap = function (data, canvas) {
    if (data.length === 0) return renderEmpty(canvas);

    // Collect all segments and average by index
    let segByIndex = {};

    data.forEach(row => {
        const hm = row.classification_data.conversation_heatmap;
        if (!Array.isArray(hm)) return;
        hm.forEach(seg => {
            const idx = seg.segment_index;
            if (!segByIndex[idx]) segByIndex[idx] = { emotional: [], engagement: [], flags: 0, count: 0 };
            segByIndex[idx].emotional.push(seg.emotional_intensity || 0);
            segByIndex[idx].engagement.push(seg.engagement_level || 0);
            if (seg.attention_flag) segByIndex[idx].flags++;
            segByIndex[idx].count++;
        });
    });

    const indexes = Object.keys(segByIndex).map(Number).sort((a, b) => a - b);
    if (indexes.length === 0) return renderEmpty(canvas, "Heatmap não gerado nestes atendimentos.");

    const emotionalAvg = indexes.map(i => {
        const arr = segByIndex[i].emotional;
        return parseFloat((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2));
    });
    const engagementAvg = indexes.map(i => {
        const arr = segByIndex[i].engagement;
        return parseFloat((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2));
    });
    const labels = indexes.map(i => `Seg ${i + 1}`);

    canvas.innerHTML = `
        <div class="report-card">
            <h3 class="text-sm font-bold text-gray-800 uppercase mb-1">Linha do Tempo — Intensidade Emocional vs Engajamento</h3>
            <p class="text-xs text-gray-500 mb-6">Média de todos os áudios filtrados. O pico de interesse do cliente fica visível no gráfico.</p>
            <div style="height:350px; position:relative;">
                <canvas id="chart-heatmap"></canvas>
            </div>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div class="report-card text-center">
                <p class="stat-label mb-2">Intensidade Emocional Pico</p>
                <p class="stat-value text-purple-600">${Math.max(...emotionalAvg).toFixed(2)}</p>
            </div>
            <div class="report-card text-center">
                <p class="stat-label mb-2">Engajamento Médio Global</p>
                <p class="stat-value text-blue-600">${(engagementAvg.reduce((a, b) => a + b, 0) / engagementAvg.length).toFixed(2)}</p>
            </div>
            <div class="report-card text-center">
                <p class="stat-label mb-2">Segmentos de Atenção Crítica</p>
                <p class="stat-value text-red-600">${Object.values(segByIndex).reduce((s, v) => s + v.flags, 0)}</p>
            </div>
        </div>
    `;

    createChartJS(document.getElementById('chart-heatmap').getContext('2d'), 'line', {
        labels,
        datasets: [
            { label: 'Intensidade Emocional', data: emotionalAvg, borderColor: '#8b5cf6', backgroundColor: 'rgba(139,92,246,0.1)', fill: true, tension: 0.4 },
            { label: 'Engajamento', data: engagementAvg, borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.08)', fill: true, tension: 0.4 }
        ]
    }, {
        responsive: true, maintainAspectRatio: false,
        scales: { y: { beginAtZero: true, max: 1.0 } }
    });
};
