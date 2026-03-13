# Análise Comparativa e Plano de Incorporação Integral: v0 + v5.0

Após a sua orientação, confirmo e **garanto que 100% do planejamento original (v0) está preservado e faz parte ativa deste novo plano**. Nenhuma funcionalidade, agente, infraestrutura ou pipeline já desenhados na v0 será descartado. As novidades trazidas no v5.0 atuarão **exclusivamente como módulos acoplados** à fundação sólida que já existe.

Além disso, seguindo sua determinação expressa, **toda menção a integrações com ERP e CRM reais foram sumariamente removidas** do escopo do projeto, simplificando as etapas de expansão e mantendo o sistema autônomo.

---

## 1. Como as Diferenças Serão Acopladas à Base (100% Preservada)

A fundação existente (Fases originais do v0) é a espinha dorsal. As novas etapas e agentes serão conectadas como serviços adicionais no pipeline.

| Dimensão | Planejamento Original (v0) | Incorporação v5.0 |
|----------|--------------------------|----------------------------------------------------|
| **Agentes LLM** | 7 Agentes Originais | **Garantia dos 7 Agentes originais** + Adição secundária do Simulador de Treino (A8) e do Motor de Buscas Semânticas (A9). |
| **Integridade do Pipeline** | 5 Etapas (E1 a E5) | **Garantia das 5 Etapas.** Mantemos o determinismo de E2. Inserimos as *Views* SQL como forma eficiente de extrair dados limpos para renderização (E6). |
| **Integrações de Parceiros** | Não possuía integrações B2B profundas. | **Explicitamente Descartadas.** CRM (Salesforce, Hubspot, etc.) e ERP/PDV reais **não farão parte** da arquitetura imediata do projeto. |
| **Pré-Processamento de Áudio** | Transcrição Direta | **Mantido método original 100%.** As tarefas propostas no v5.0 de análise acústica local (librosa/WebRTC VAD) seguem **descartadas**. O projeto não fará fardos de processamento local no Python para acústica fina. |
| **Motor do Agente A3** | Cadeia de pensamento genérica. | **Acoplamento.** O backend orientará um roteiro de 4 matrizes base para gerar consistência quantitativa no score final avaliando urgência, foco e intenção. |

---

## 2. Passo a Passo da Incorporação Segura

A execução a seguir constrói sobre as fundações já validadas:

### A. Incremento Progressivo do Banco de Dados (PostgreSQL/Supabase)
* O schema que sustenta as requisições antigas se mantém. Adicionaremos **novas tabelas isoladas** em complemento, injetando segurança de visualização via RLS Granular.

### B. Manutenção e Polimento do Parser/Extractor (Python FastAPI)
* O Parser e Extractor do v0 (E1/E2) não sofrerão refatoração destrutiva. Iremos apenas habilitar módulos incrementais de *regex* e cálculos lógicos em backend (ex: calcular a diferença entre os produtos que o cliente pediu *versus* os que o vendedor efetivamente indicou). Todo processamento focado 100% em **texto** e zero em manipulação de canais de áudio brutos.

### C. Agentes Autônomos Evolutivos
* O output formatado v0 não sofrerá dano. Iremos blindar o prompt e as saídas por Pydantic visando sanar de vez a quebra de json na tipagem, reforçando enumeradores firmes para combater as imprecisões que ocorriam.
