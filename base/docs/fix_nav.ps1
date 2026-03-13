
$files = @(
    "C:\Users\User\.gemini\antigravity\scratch\AI-Audio-Analyst\public\dashboard.html",
    "C:\Users\User\.gemini\antigravity\scratch\AI-Audio-Analyst\public\chat.html",
    "C:\Users\User\.gemini\antigravity\scratch\AI-Audio-Analyst\public\settings.html",
    "C:\Users\User\.gemini\antigravity\scratch\AI-Audio-Analyst\public\relatorio.html",
    "C:\Users\User\.gemini\antigravity\scratch\AI-Audio-Analyst\public\upload.html"
)

# The single clean nav link block we want (no accents, no Custo de TI)
# We'll replace everything between <div class="space-x-4"> and </nav> with a clean version.
# Strategy: use regex to replace entire nav links div regardless of its current state.

$navPattern = '(?s)(<div[^>]*(?:space-x-4|space-x-1)[^>]*>).*?(</nav>)'

$dashNav = @'
        <div class="space-x-4">
            <a href="dashboard.html" class="text-blue-600 font-semibold">Meus Audios</a>
            <a href="relatorio_dinamico.html" class="text-purple-600 hover:text-purple-800 font-semibold">Relatorios</a>
            <a href="settings.html" class="text-gray-600 hover:text-blue-600">Configuracoes</a>
            <button onclick="logout()" class="text-red-500 hover:text-red-700">Sair</button>
        </div>
    </nav>
'@

foreach ($file in $files) {
    $content = [System.IO.File]::ReadAllText($file, [System.Text.Encoding]::UTF8)
    $fixed = [System.Text.RegularExpressions.Regex]::Replace($content, $navPattern, $dashNav)
    [System.IO.File]::WriteAllText($file, $fixed, (New-Object System.Text.UTF8Encoding $false))
    Write-Host "Done: $([System.IO.Path]::GetFileName($file))"
}
