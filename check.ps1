# Repo health check: launcher TypeScript, launcher Rust, and a Simba compile
# sweep of every script against its matching library generation.
#
#   .\check.ps1            run everything
#   .\check.ps1 -SkipSimba skip the (slow) script sweep
param(
    [switch]$SkipWeb,
    [switch]$SkipRust,
    [switch]$SkipSimba
)

$repo = $PSScriptRoot
$failures = @()

if (-not $SkipWeb) {
    Write-Host "== TypeScript (tsc --noEmit) ==" -ForegroundColor Cyan
    Push-Location "$repo\launcher"
    pnpm exec tsc --noEmit
    if ($LASTEXITCODE -ne 0) { $failures += "tsc" }
    Pop-Location
}

if (-not $SkipRust) {
    Write-Host "== Rust (cargo check) ==" -ForegroundColor Cyan
    Push-Location "$repo\launcher\src-tauri"
    cargo check --quiet
    if ($LASTEXITCODE -ne 0) { $failures += "cargo check" }
    Pop-Location
}

if (-not $SkipSimba) {
    Write-Host "== Simba compile sweep ==" -ForegroundColor Cyan
    $runtime = "$repo\runtime"
    $inc = "$runtime\Includes"

    # Remember where the junctions point so the sweep can restore them.
    $originalGen = if ((Get-Item "$inc\WaspLib").Target -match "_v1$") { "v1" } else { "v2" }

    function Set-Gen($gen) {
        foreach ($name in @("SRL-T", "WaspLib")) {
            $link = Join-Path $inc $name
            if (Test-Path $link) { (Get-Item $link).Delete() }
            New-Item -ItemType Junction -Path $link -Target (Join-Path $inc "$name`_$gen") | Out-Null
        }
    }

    function Compile-One($file) {
        $p = Start-Process -FilePath "$runtime\Simba64.exe" -ArgumentList "--compile", "Scripts\$file" -PassThru -NoNewWindow `
            -RedirectStandardOutput "$env:TEMP\check-out.txt" -RedirectStandardError "$env:TEMP\check-err.txt" -WorkingDirectory $runtime
        if (-not $p.WaitForExit(120000)) { $p.Kill(); return "TIMEOUT" }
        $txt = (Get-Content "$env:TEMP\check-out.txt" -Raw -ErrorAction SilentlyContinue) + (Get-Content "$env:TEMP\check-err.txt" -Raw -ErrorAction SilentlyContinue)
        if ($txt -match "Succesfully compiled") { return "OK" }
        return "FAIL: " + (($txt -split "`r?`n" | Where-Object { $_ -ne "" } | Select-Object -First 2) -join " | ")
    }

    $v1 = @(); $v2 = @()
    foreach ($s in Get-ChildItem "$runtime\Scripts\*.simba" | Sort-Object Name) {
        if ((Get-Content $s.FullName -Raw) -match "osr\.simba") { $v1 += $s.Name } else { $v2 += $s.Name }
    }
    Write-Host "v1=$($v1.Count) v2=$($v2.Count)"

    foreach ($batch in @(@("v1", $v1), @("v2", $v2))) {
        $gen = $batch[0]
        Set-Gen $gen
        foreach ($name in $batch[1]) {
            $r = Compile-One $name
            if ($r -ne "OK") {
                Write-Host "$gen $name -> $r" -ForegroundColor Red
                $failures += "simba: $name"
            } else {
                Write-Host "$gen $name -> OK"
            }
        }
    }
    Set-Gen $originalGen
}

Write-Host ""
if ($failures.Count -eq 0) {
    Write-Host "ALL CHECKS PASSED" -ForegroundColor Green
    exit 0
}
Write-Host "FAILED: $($failures -join ', ')" -ForegroundColor Red
exit 1
