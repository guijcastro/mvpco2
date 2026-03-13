import os
import re

PUBLIC = "/mnt/c/Users/User/.gemini/antigravity/scratch/AI-Audio-Analyst/public"

files = [f for f in os.listdir(PUBLIC) if f.endswith('.html')]

# The exact clean nav we want
CLEAN_NAV = '''        <div class="space-x-4 flex items-center">
            <a href="dashboard.html" class="text-blue-600 font-semibold">Meus Áudios</a>
            <a href="relatorio.html" class="text-green-600 hover:text-green-800 font-semibold">Custos</a>
            <a href="relatorio_dinamico.html" class="text-purple-600 hover:text-purple-800 font-semibold">Relatórios</a>
            <a href="logs.html" class="text-indigo-600 font-semibold hover:text-indigo-800">Logs de Chat</a>
            <a href="settings.html" class="text-gray-600 hover:text-blue-600">Configurações</a>
            <button onclick="logout()" class="text-red-500 hover:text-red-700">Sair</button>
        </div>'''

# Mapeamento do mojibake
replacements = {
    "Á¡": "á",
    "Á¢": "â",
    "Á£": "ã",
    "Á§": "ç",
    "Á©": "é",
    "Áª": "ê",
    "Á­": "í",
    "Á³": "ó",
    "Á´": "ô",
    "Áµ": "õ",
    "Áº": "ú",
    "Á ": "Á",
    "íudo": "áudio",
    "Á udio": "Áudio",
    "InteraçÁ£o": "Interação",
    "transcriçÁ£o": "transcrição"
}

def fix_content(content):
    # Fix mojibake
    for bad, good in replacements.items():
        content = content.replace(bad, good)
        
    # Fix the missing </div> from the navbar
    # The previous script replaced everything from <div space-x> up to </nav> with CLEAN_NAV.
    # We now look for CLEAN_NAV followed by </nav> with no closing </div> for the container!
    
    # We want to make sure there's EXACTLY two </div>s before </nav> if we match CLEAN_NAV.
    # Actually, we can just replace the whole space-x block.
    # Let's find `<div class="space-x-4 flex items-center">` ... `</nav>`
    # and replace with CLEAN_NAV + `\n        </div>\n    </nav>`
    
    pattern = re.compile(r'<div class="space-x-4 flex items-center">.*?</nav>', re.DOTALL)
    
    new_nav_block = CLEAN_NAV + '\n        </div>\n    </nav>'
    
    content = pattern.sub(new_nav_block, content)
    
    return content

for fname in files:
    fpath = os.path.join(PUBLIC, fname)
    with open(fpath, "r", encoding="utf-8") as f:
        content = f.read()
        
    new_content = fix_content(content)
    
    with open(fpath, "w", encoding="utf-8") as f:
        f.write(new_content)
    
    print(f"Fixed {fname}")
