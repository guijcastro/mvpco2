# AI Audio Analyst - Project Documentation

## 1. Visão Geral do Projeto
**AI Audio Analyst** (prototype: VoiceIntel SaaS) é uma plataforma web para análise inteligente de áudios, focado em "Cliente Oculto" e transcrição automática. O sistema permite que usuários façam upload de arquivos de áudio, obtenham transcrições automáticas e realizem análises qualitativas usando IA Generativa (Google Gemini).

O projeto é construído para rodar em arquitetura *Serverless* (Netlify Functions) ou através de um servidor local otimizado com **Bun**, utilizando **Supabase** como Backend-as-a-Service (BaaS) para autenticação, banco de dados e armazenamento de arquivos.

## 2. Especificações Técnicas

### Stack Tecnológico
- **Frontend**: HTML5, TailwindCSS (CDN), Vanilla JS.
- **Backend Runtime**: 
  - **Local/Dev**: Bun (Server & API Proxy).
  - **Production**: Netlify Functions (Node.js runtime).
- **Database & Auth**: Supabase (PostgreSQL + GoTrue).
- **Storage**: Supabase Storage (Bucket 'audios').
- **AI Models**: 
  - **Transcription/Analysis**: Google Gemini 2.0 Flash (`@google/generative-ai`).
  - **Legacy/Alt**: OpenAI (integração presente mas secundária).
- **Security**: 
  - Client-side Encryption (AES-GCM) para chaves de API.
  - Row Level Security (RLS) no PostgreSQL.

### Arquitetura
```mermaid
graph TD
    User[Usuário] -->|HTTPS| Frontend[Web Frontend (HTML/JS)]
    Frontend -->|Auth/Data| Supabase[Supabase (Auth/DB/Storage)]
    Frontend -->|API Calls| API_Gateway{API Gateway}
    
    API_Gateway -->|Local| BunServer[Bun Server (localhost:8888)]
    API_Gateway -->|Prod| Netlify[Netlify Functions]
    
    BunServer -->|AI Processing| Gemini[Google Gemini API]
    Netlify -->|AI Processing| Gemini
    
    subgraph Supabase Services
        Auth[Authentication]
        DB[(PostgreSQL DB)]
        Storage[File Storage]
    end
    
    Supabase --> Auth
    Supabase --> DB
    Supabase --> Storage
```

## 3. Funcionalidades

### ✅ Implementadas
1.  **Autenticação de Usuário**: Login e Registro via Email/Senha (Supabase Auth).
2.  **Upload de Áudio**: Envio de arquivos de áudio para bucket privado com URLs assinadas.
3.  **Transcrição de Áudio (Gemini 2.0 Flash)**: 
    - Processamento rápido de áudios.
    - Suporte a múltiplos formatos (mp3, wav, ogg, etc).
4.  **Análise "Cliente Oculto"**:
    - Interface de chat dedicada (`manual_analysis.html`).
    - Análise contextual baseada na transcrição.
    - Prompt de sistema especializado para avaliações objetivas.
5.  **Chat com IA**: Interface de chat geral para interagir com o modelo.
6.  **Gestão de API Keys**:
    - Armazenamento seguro de chaves de API do usuário (Gemini/OpenAI).
    - **Criptografia no Cliente**: As chaves são criptografadas no navegador antes de serem salvas no banco, garantindo que o servidor nunca tenha acesso às chaves em texto plano.
7.  **Segurança de Dados (RLS)**: Políticas rigorosas garantindo que usuários acessem apenas seus próprios dados.

### 🚧 Em Planejamento / Parcial
- **Integração OpenAI Whisper**: O código base da função serverless (`netlify/functions/transcribe.js`) contém estrutura para OpenAI, mas atualmente utiliza um mock ou está em transição para Gemini no servidor Bun.
- **Dashboard Analítico Avançado**: A estrutura HTML existe (`dashboard.html`), mas a integração completa de métricas agregadas ainda pode ser expandida.

## 4. Banco de Dados (Schema)

O banco de dados utiliza PostgreSQL hospedado no Supabase.

### Tabelas Principais

#### `audio_files`
Armazena metadados dos arquivos de áudio.
- `id`: UUID (PK)
- `user_id`: UUID (FK -> auth.users)
- `file_name`: Text
- `storage_path`: Text (Caminho no bucket)
- `status`: Text (ex: 'uploaded', 'transcribed')

#### `transcriptions`
Armazena o texto transcrito.
- `id`: UUID (PK)
- `audio_id`: UUID (FK -> audio_files)
- `user_id`: UUID (FK -> auth.users)
- `text`: Text (Conteúdo da transcrição)

#### `user_settings`
Armazena configurações e chaves de API criptografadas.
- `user_id`: UUID (PK, FK -> auth.users)
- `openai_key`: Text (Encrypted)
- `gemini_key`: Text (Encrypted)

### Segurança (RLS)
Todas as tabelas possuem Row Level Security (RLS) habilitado.
Exemplo de política:
```sql
CREATE POLICY "Users can view own audio files" 
ON audio_files FOR SELECT 
USING (auth.uid() = user_id);
```

## 5. API Endpoints

A API segue o padrão de Netlify Functions, mas é emulada localmente pelo servidor Bun.

### `POST /.netlify/functions/transcribe`
- **Input**: `{ "audioUrl": "string", "apiKey": "string" }`
- **Output**: `{ "text": "Transcrição do áudio..." }`
- **Logic**: Baixa o áudio da URL assinada e envia para o modelo Gemini 2.0 Flash para transcrição.

### `POST /.netlify/functions/chat_v2`
- **Input**: `{ "messages":Array, "apiKey": "string" }`
- **Output**: `{ "reply": "Resposta da IA..." }`
- **Logic**: Mantém histórico de conversação e interage com o modelo Gemini. Processa mensagens de sistema para contexto.

### `POST /.netlify/functions/analyze`
- **Input**: `{ "transcription": "string", "query": "string", "apiKey": "string" }`
- **Output**: `{ "result": "Análise..." }`
- **Logic Endpoint**: Especializado para "Cliente Oculto". Injta um System Prompt de analista expert e responde perguntas baseadas estritamente na transcrição fornecida.

## 6. Configuração e Instalação

### Pré-requisitos
- [Bun](https://bun.sh) instalado.
- Conta no Supabase (URL e Key).
- Chave de API Google Gemini.

### Como Rodar (Local)
1.  **Instalar dependências**:
    ```bash
    bun install
    ```
2.  **Configurar Variáveis de Ambiente**:
    Crie um arquivo `.env` ou exporte no shell:
    ```bash
    export SUPABASE_URL="sua_url"
    export SUPABASE_KEY="sua_chave_anon"
    ```
3.  **Iniciar Servidor**:
    ```bash
    bun run bun_server.js
    ```
4.  **Acessar**: Navegue para `http://localhost:8888`.

## 7. Estrutura de Pastas Relevante
```
/
├── bun_server.js            # Servidor principal (Dev/Local)
├── netlify/
│   └── functions/           # Serverless Functions (Prod logic)
├── public/                  # Arquivos Estáticos (Frontend)
│   ├── js/                  # Scripts client-side
│   ├── dashboard.html       # Painel principal
│   ├── manual_analysis.html # Ferramenta de análise manual
│   └── ...
├── create_bucket.sql        # Script de setup inicial do DB
└── package.json             # Dependências e scripts
```
