# DREAMSCAPE ONE — 4C-4D-4 targeted teaching integration source collection.
# Read-only: copies source files; never modifies original project files.
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$zipPath = Join-Path $root 'DREAMSCAPE_PHASE_4C-4D-4_TEACHING_INTEGRATION_SOURCE.zip'
$temp = Join-Path $env:TEMP ('dreamscape-4d4-source-' + [guid]::NewGuid().ToString('N'))

# The existing CoreTeachingEngine is essential for wiring the new 4C selector.
# Include only source from its teaching folder and these targeted dependencies.
$teachingDir = 'app/learning-missions/core/[subject]/[level]/quiz/[quizId]/teaching'
$required = @(
    "$teachingDir/CoreTeachingEngine.tsx",
    'lib/learning-access.ts',
    'lib/math-intelligence/teaching/understanding/understandTeachingQuestion.ts',
    'lib/math-intelligence/teaching/understanding/types.ts',
    'lib/math/teaching/strategy-selection/phase4C4Adapter.ts',
    'lib/math/teaching/strategy-selection/approval/b4ApprovalGateway.server.cjs'
)

function Copy-SourceFile([string]$relative) {
    $source = Join-Path $root $relative
    if (-not (Test-Path -LiteralPath $source -PathType Leaf)) {
        throw "Required source file missing: $relative"
    }
    $target = Join-Path $temp $relative
    $parent = Split-Path -Path $target -Parent
    New-Item -ItemType Directory -Path $parent -Force | Out-Null
    Copy-Item -LiteralPath $source -Destination $target
    Write-Host "Included: $relative" -ForegroundColor Green
}

try {
    New-Item -ItemType Directory -Path $temp -Force | Out-Null
    foreach ($relative in $required) { Copy-SourceFile $relative }

    $folder = Join-Path $root $teachingDir
    # The component can import adjacent teaching files. Cap the collection and
    # include source only—no .env, SQL, runtime dumps, build products or media.
    $extra = @(Get-ChildItem -LiteralPath $folder -Recurse -File | Where-Object {
        $_.Extension -in @('.ts', '.tsx', '.cjs', '.mjs') -and
        $_.Name -ne 'tsconfig.tsbuildinfo' -and $_.Length -le 1048576 -and
        $_.FullName -notmatch '[\\/](node_modules|build|dist|\.next|coverage)[\\/]'
    })
    if ($extra.Count -gt 50) { throw 'Teaching source folder contains over 50 source files. Please inspect before sharing.' }
    foreach ($item in $extra) {
        $relative = $item.FullName.Substring($root.Length + 1)
        Copy-SourceFile $relative
    }

    Compress-Archive -Path (Join-Path $temp '*') -DestinationPath $zipPath -Force
    if (-not (Test-Path -LiteralPath $zipPath -PathType Leaf)) { throw 'ZIP was not created.' }
    Write-Host "`nZIP created: $zipPath" -ForegroundColor Cyan
    if ($IsWindows -or $env:OS -eq 'Windows_NT') {
        explorer.exe /select,"$zipPath"
    }
}
finally {
    if (Test-Path -LiteralPath $temp) { Remove-Item -LiteralPath $temp -Recurse -Force }
}

# For Supabase RPC definitions, do not include database dumps or secrets in this
# source ZIP. See the README for safe verification queries if they are needed.
