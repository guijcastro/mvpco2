#!/usr/bin/env python3
import re
import os

PUBLIC = "/mnt/c/Users/User/.gemini/antigravity/scratch/AI-Audio-Analyst/public"

files = [
    "dashboard.html",
    "chat.html",
    "settings.html",
    "relatorio.html",
    "upload.html",
    "relatorio_dinamico.html",
]

# The clean nav links HTML we want in every page
CLEAN_NAV = '''        <div class="space-x-4 flex items-center">
            <a href="dashboard.html" class="text-blue-600 font-semibold">Meus \u00c1udios</a>
            <a href="relatorio_dinamico.html" class="text-purple-600 hover:text-purple-800 font-semibold">Relat\u00f3rios</a>
            <a href="settings.html" class="text-gray-600 hover:text-blue-600">Configura\u00e7\u00f5es</a>
            <button onclick="logout()" class="text-red-500 hover:text-red-700">Sair</button>
        </div>'''

# Pattern that matches any nav links div (space-x-4 or space-x-1) and everything up to </nav>
PATTERN = re.compile(
    r'<div[^>]*(?:space-x-4|space-x-1|space-x-6)[^>]*>.*?</div>\s*(?=</nav>)',
    re.DOTALL
)

for fname in files:
    fpath = os.path.join(PUBLIC, fname)
    try:
        with open(fpath, "r", encoding="utf-8") as f:
            content = f.read()
    except UnicodeDecodeError:
        with open(fpath, "r", encoding="latin-1") as f:
            content = f.read()

    new_content, count = PATTERN.subn(CLEAN_NAV + "\n", content)

    with open(fpath, "w", encoding="utf-8") as f:
        f.write(new_content)

    print(f"{'OK' if count else 'NO MATCH'} ({count} subs): {fname}")
