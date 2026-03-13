// Reports Engine
// Orchestrates the 40+ specific JSON metric mappings into dedicated HTML views

const supabaseUrl = window.SUPABASE_URL || localStorage.getItem('SUPABASE_URL');
const supabaseKey = window.SUPABASE_KEY || localStorage.getItem('SUPABASE_KEY');
if (!supabaseUrl) window.location.href = 'login.html';
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

const AppState = {
    rawData: [],
    filteredData: [],
    currentReportId: 'falantes', // Default launch page
    charts: {} // Keep track of charts to destroy them on navigation
};

// ==========================================
// 1. DATA FETCHING & FILTERING
// ==========================================
async function fetchAndInitializeData() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) return window.location.href = 'login.html';

    // We join audio_files to get the store_id
    const { data, error } = await supabaseClient
        .from('audio_classifications')
        .select(`
            classification_data, 
            model_used, 
            created_at,
            audio_files ( store_id, file_name )
        `)
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

    document.getElementById('global-loader').classList.add('hidden');

    if (error || !data || data.length === 0) {
        document.getElementById('empty-db-state').classList.remove('hidden');
        return;
    }

    // Filter out rows without valid classification data
    AppState.rawData = data.filter(d => d.classification_data);

    if (AppState.rawData.length === 0) {
        document.getElementById('empty-db-state').classList.remove('hidden');
        return;
    }

    // Process initially (No Filter)
    applyFilters();
}

function applyFilters() {
    const storeFilter = document.getElementById('global-store-filter').value;

    if (storeFilter === 'all') {
        AppState.filteredData = AppState.rawData;
    } else {
        AppState.filteredData = AppState.rawData.filter(d => {
            const store = d.audio_files?.store_id || 'Loja Central'; // Fallback for old data
            return store === storeFilter;
        });
    }

    document.getElementById('data-count-badge').innerHTML = `<span class="text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">${AppState.filteredData.length}</span> Análises Filtradas`;

    // Re-render current page
    renderDetailedReport(AppState.currentReportId);
}

// ==========================================
// 2. THE 40-REPORT NAVIGATION SCHEMA
// ==========================================
const ReportSchema = [
    {
        group: 'Avaliação & Conversa',
        items: [
            { id: 'qa_checklist', icon: 'check-square', title: 'Avaliação do Checklist (QA)', desc: 'Nota geral de qualidade, divisão de itens aprovados e reprovados com evidências.', renderKey: 'renderQAChecklist' },
            { id: 'fases_venda', icon: 'git-merge', title: 'Estrutura da Conversa', desc: 'Duração cronometrada de cada fase e validação se a venda foi concluída.', renderKey: 'renderConversationPhases' },
            { id: 'falantes', icon: 'mic', title: 'Identificação de Falantes', desc: 'Proporção de fala (Monólogo vs Diálogo), interrupções e perguntas abertas/fechadas.', renderKey: 'renderSpeakerInference' },
            { id: 'heatmap_emocional', icon: 'flame', title: 'Mapa de Calor da Conversa', desc: 'Linha do tempo mostrando a intensidade emocional ao longo do atendimento.', renderKey: 'renderHeatmap' }
        ]
    },
    {
        group: 'Performance de Vendas',
        items: [
            { id: 'vendas_conversao', icon: 'target', title: 'Taxa de Conversão & Perdas', desc: 'Análise entre vendas concluídas e motivos de recusa.', renderKey: 'renderConversion' },
            { id: 'vendas_ticket', icon: 'dollar-sign', title: 'Ticket & Descontos', desc: 'Visão agregada de valores finais e concessões de desconto.', renderKey: 'renderTicket' },
            { id: 'vendas_timing', icon: 'clock', title: 'Timing Comercial', desc: 'Segundos gastos até apresentar o produto, apresentar preço e tempo de decisão do cliente.', renderKey: 'renderTiming' },
            { id: 'vendas_score', icon: 'award', title: 'Score de Eficiência', desc: 'A nota composta de quão eficiente financeiramente e comercialmente a venda foi.', renderKey: 'renderEfficiencyScore' }
        ]
    },
    {
        group: 'Oportunidades Perdidas (R$)',
        items: [
            { id: 'perdas_cross_sell', icon: 'layers', title: 'Cross-Sell Ignorado', desc: 'Produtos complementares não ofertados e prejuízo estimado cumulativo.', renderKey: 'renderCrossSell' },
            { id: 'perdas_upsell', icon: 'trending-up', title: 'Upsell Ignorado', desc: 'Falhas em oferecer versões Premium e diferença de ticket não capturada.', renderKey: 'renderUpSell' },
            { id: 'perdas_implicitas', icon: 'message-square-dashed', title: 'Necessidades Implícitas', desc: 'Dores verbalizadas veladamente pelo cliente que o vendedor deixou passar.', renderKey: 'renderImplicitNeeds' },
            { id: 'produtos_gap', icon: 'package', title: 'Gap Pedido vs. Apresentado', desc: 'Desalinhamento entre o que o cliente buscou e o que foi empurrado.', renderKey: 'renderProductGap' }
        ]
    },
    {
        group: 'Intenção & Preditivo',
        items: [
            { id: 'intencao_compra', icon: 'thermometer', title: 'Intenção de Compra', desc: 'Score de predisposição à compra, separando meros curiosos de clientes urgentes.', renderKey: 'renderPurchaseIntent' },
            { id: 'nlp_gatilhos', icon: 'zap', title: 'Gatilhos Verbalizados', desc: 'Palavras ou ações que acendem a prova de intencionalidade de fechamento.', renderKey: 'renderBuyTriggers' },
            { id: 'nlp_urgencia', icon: 'timer', title: 'Sinais de Urgência', desc: 'Evidências textuais do cliente apressado exigindo agilidade no fechamento.', renderKey: 'renderUrgency' },
            { id: 'preditivo_futuro', icon: 'crystal-ball', title: 'Previsão Futura', desc: 'Risco de Churn, melhor janela de follow-up e ticket projetado.', renderKey: 'renderPredictive' }
        ]
    },
    {
        group: 'Inteligência Comportamental',
        items: [
            { id: 'perfil_cliente', icon: 'users', title: 'Perfil Demográfico', desc: 'Distribuição estimada de idades, gêneros, poder de compra e profissões.', renderKey: 'renderDemographics' },
            { id: 'psicologia_arquetipo', icon: 'brain-circuit', title: 'Psicologia e Arquétipo', desc: 'Racionais vs Emocionais, Aversão a Risco e Estilo de Decisão.', renderKey: 'renderPsychology' },
            { id: 'comportamento_nivel', icon: 'activity', title: 'Engajamento & Conhecimento', desc: 'O cliente sabe profundamente do produto ou é iniciante?', renderKey: 'renderEngagement' },
            { id: 'perfil_consumo', icon: 'shopping-cart', title: 'Perfil de Consumo', desc: 'Sensibilidade a preço e mapeamento de compras recorrentes.', renderKey: 'renderConsumption' }
        ]
    },
    {
        group: 'Análise NLP & Sentimento',
        items: [
            { id: 'nlp_sentimento', icon: 'smile', title: 'Balanço de Sentimento', desc: 'Mapeamento Positivo, Negativo ou Misto entre Vendedor e Cliente.', renderKey: 'renderSentiment' },
            { id: 'nlp_emocoes', icon: 'heart-pulse', title: 'Radar Curvo de Emoções', desc: 'Frequência de frustrações, entusiasmo, tédio e ansiedade na fala.', renderKey: 'renderEmotions' },
            { id: 'nlp_entidades', icon: 'network', title: 'Nuvem de Entidades', desc: 'Principais marcas, valores cruzados e concorrentes capturados organicamente.', renderKey: 'renderEntities' },
            { id: 'nlp_palavras_chave', icon: 'key', title: 'Keyword Cloud', desc: 'As palavras e expressões mais marteladas por ambos os lados.', renderKey: 'renderKeywords' }
        ]
    },
    {
        group: 'Tensão & Atrito',
        items: [
            { id: 'linha_tempo_critica', icon: 'git-commit', title: 'Momentos Críticos', desc: 'Linha do tempo tática: picos de virada (Turnarounds) e vales (Quedas brutais).', renderKey: 'renderCriticalMoments' },
            { id: 'objecoes_diretas', icon: 'shield-alert', title: 'Matriz de Objeções', desc: 'Tabela dissecando a frase exata da objeção (ex: tá caro) frente a réplica do vendedor.', renderKey: 'renderObjections' },
            { id: 'criticas_ocultas', icon: 'eye-off', title: 'Críticas Veladas (Tóxicas)', desc: 'Radar de sinais de alerta grave mascarados em cortesia, sarcasmo ou tédio.', renderKey: 'renderHiddenCriticisms' },
            { id: 'concorrencia_comparacao', icon: 'swords', title: 'Comparação Competitiva', desc: 'O cliente levantou um rival? Foi em tom favorável a ele ou a nós?', renderKey: 'renderCompetitors' }
        ]
    },
    {
        group: 'Comunicação & Riscos Operacionais',
        items: [
            { id: 'comunicacao_empatia', icon: 'messages-square', title: 'Postura & Empatia', desc: 'A escuta do seu time é ativa ou passiva? Tabela de "Linguagem Robótica vs Humanizada".', renderKey: 'renderEmpathy' },
            { id: 'comunicacao_tecnicas', icon: 'wand-2', title: 'Técnicas Secretas (SPIN, etc)', desc: 'Quais arquiteturas formais de persuasão a IA extraiu do córtex da venda.', renderKey: 'renderSalesTechniques' },
            { id: 'compliance_riscos', icon: 'alert-triangle', title: 'Riscos (Black Hat)', desc: 'Alertas contundentes de promessas estelionatárias e violação do código do consumidor.', renderKey: 'renderComplianceRisks' },
            { id: 'compliance_direitos', icon: 'gavel', title: 'Termos de Garantia', desc: 'Policiamento do script sobre obrigatoriedade de enunciar termos jurídicos de troca.', renderKey: 'renderComplianceTerms' },
            { id: 'retorno_contato', icon: 'phone-forwarded', title: 'Amarração & Follow-up', desc: 'A venda vazou? Eles retiveram whatsapp/email para reaquecimento?', renderKey: 'renderFollowUp' }
        ]
    }
];

// Build Sidebar
function buildSidebar() {
    const container = document.getElementById('sidebar-nav-container');
    container.innerHTML = '';

    ReportSchema.forEach((groupObj, gIdx) => {
        // Render Group Title
        const titleDiv = document.createElement('div');
        titleDiv.className = 'nav-group-title mt-6';
        titleDiv.textContent = groupObj.group;
        container.appendChild(titleDiv);

        // Render Links
        groupObj.items.forEach(item => {
            const link = document.createElement('div');
            link.className = `nav-link ${item.id === AppState.currentReportId ? 'active' : ''}`;
            link.id = `nav-${item.id}`;
            link.innerHTML = `<i data-lucide="${item.icon}"></i> <span>${item.title}</span>`;

            // Add subtle tooltip/desc later if needed
            link.title = item.desc;

            link.onclick = () => {
                // Remove active class from all
                document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
                link.classList.add('active');

                // Trigger Render
                renderDetailedReport(item.id);
            };

            container.appendChild(link);
        });
    });

    lucide.createIcons();
}

// ==========================================
// 3. RENDER ORCHESTRATOR
// ==========================================
function renderDetailedReport(reportId) {
    AppState.currentReportId = reportId;

    // Destroy old charts
    Object.values(AppState.charts).forEach(c => c.destroy());
    AppState.charts = {};

    const canvas = document.getElementById('report-canvas');
    canvas.innerHTML = '';

    // Find metadata
    let targetItem = null;
    let targetGroup = null;
    for (const g of ReportSchema) {
        const found = g.items.find(i => i.id === reportId);
        if (found) { targetItem = found; targetGroup = g; break; }
    }

    if (!targetItem) return;

    // Update Header Text
    document.getElementById('report-breadcrumbs').innerHTML = `<i data-lucide="${targetItem.icon}" class="w-4 h-4 text-blue-500"></i> ${targetGroup.group} <i data-lucide="chevron-right" class="w-3 h-3 text-gray-400"></i>`;
    document.getElementById('report-title').textContent = targetItem.title;
    document.getElementById('report-description').textContent = targetItem.desc;
    document.getElementById('report-header').classList.remove('hidden');
    canvas.classList.remove('hidden');
    lucide.createIcons();

    // Call specific render engine via reflection
    if (typeof window[targetItem.renderKey] === 'function') {
        window[targetItem.renderKey](AppState.filteredData, canvas);
    } else {
        canvas.innerHTML = `
            <div class="report-card text-center py-20 bg-yellow-50 border-yellow-200">
                <i data-lucide="code" class="w-16 h-16 text-yellow-500 mx-auto mb-4"></i>
                <h3 class="text-xl font-bold text-yellow-800">Módulo em Construção</h3>
                <p class="text-yellow-700 mt-2">A lógica de extração profunda para <b>${targetItem.title}</b> está sendo programada pela IA de forma granulada no arquivo de renderização JS.</p>
            </div>
        `;
        lucide.createIcons();
    }
}

// ==========================================
// 4. CHART JS HELPERS
// ==========================================
function createChartJS(ctx, type, data, options = {}) {
    const id = ctx.id;
    const chart = new Chart(ctx, { type, data, options });
    AppState.charts[id] = chart;
    return chart;
}

const ChartColors = {
    blue: ['#eff6ff', '#bfdbfe', '#60a5fa', '#3b82f6', '#1d4ed8'],
    green: ['#f0fdf4', '#bbf7d0', '#4ade80', '#16a34a', '#15803d'],
    red: ['#fef2f2', '#fecaca', '#f87171', '#dc2626', '#b91c1c'],
    yellow: ['#fefce8', '#fef08a', '#facc15', '#ca8a04', '#a16207'],
    mixed: ['#3b82f6', '#10b981', '#f43f5e', '#f59e0b', '#8b5cf6', '#0ea5e9', '#ec4899']
};

// ==========================================
// 5. BOOTSTRAP
// ==========================================
window.appModule = { applyFilters };

window.onload = () => {
    buildSidebar();
    fetchAndInitializeData();
};
