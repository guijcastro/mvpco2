# AI-Audio-Analyst (WSL/Bun Setup)

This project is a Netlify + Supabase application designed to run locally with `netlify-cli` or via direct Bun execution (for functions if adapted).

## 1. Prerequisites (in WSL)
Ensure you have the following installed in your WSL environment:
- **Bun**: `curl -fsSL https://bun.sh/install | bash`
- **Netlify CLI**: `npm install -g netlify-cli` (or via Bun: `bun add -g netlify-cli`)
- **Git**: `sudo apt install git`

## 2. Setup
1.  Navigate to the project directory in WSL:
    ```bash
    cd /mnt/c/Users/User/.gemini/antigravity/scratch/AI-Audio-Analyst
    ```
    *(Adjust path if your Windows username is different)*

2.  Install dependencies:
    ```bash
    bun install
    ```

3.  Set Environment Variables:
    Create a `.env` file in the root if needed, or rely on `netlify dev` to pull from Netlify if linked.
    For local dev without linking, you can set `SUPABASE_URL` and `SUPABASE_KEY` in your shell or `.env`.

## 3. Running Locally
Start the development server:
```bash
netlify dev
```
This will start the frontend on `localhost:8888` and the functions on `localhost:8888/.netlify/functions/*`.

## 4. Production Deployment
1.  Login to Netlify: `netlify login`
2.  Deploy: `netlify deploy --prod`

## 5. Supabase Setup (Manual Steps)
Since we are using Supabase, ensure you have created:
1.  **Project**: New project in Supabase.
2.  **Auth**: Enable Email/Password provider.
3.  **Storage**: Create a public bucket named `audios`.
4.  **Database**: Run the SQL script below in the SQL Editor.

### Database Schema (Run in Supabase SQL Editor)
```sql
-- Audio Files Table
create table audio_files (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  file_name text not null,
  storage_path text not null,
  file_size bigint,
  status text default 'uploaded',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Transcriptions Table
create table transcriptions (
  id uuid default uuid_generate_v4() primary key,
  audio_id uuid references audio_files not null,
  user_id uuid references auth.users not null,
  text text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- User Settings (API Keys)
create table user_settings (
  user_id uuid references auth.users primary key,
  openai_key text,
  gemini_key text,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS Policies (Example for audio_files)
alter table audio_files enable row level security;
create policy "Users can view own audio files" on audio_files for select using (auth.uid() = user_id);
create policy "Users can insert own audio files" on audio_files for insert with check (auth.uid() = user_id);
create policy "Users can update own audio files" on audio_files for update using (auth.uid() = user_id);

-- (Repeat RLS for transcriptions and user_settings)
alter table transcriptions enable row level security;
create policy "Users can view own transcriptions" on transcriptions for select using (auth.uid() = user_id);
create policy "Users can insert own transcriptions" on transcriptions for insert with check (auth.uid() = user_id);

alter table user_settings enable row level security;
create policy "Users can view own settings" on user_settings for select using (auth.uid() = user_id);
create policy "Users can update own settings" on user_settings for insert with check (auth.uid() = user_id); -- allow upsert
create policy "Users can modify own settings" on user_settings for update using (auth.uid() = user_id);
```
