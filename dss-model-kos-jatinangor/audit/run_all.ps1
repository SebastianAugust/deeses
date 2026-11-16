# Jalankan seluruh audit (PowerShell). Dari folder mana saja:
#   powershell -ExecutionPolicy Bypass -File "dss-model-kos-jatinangor\audit\run_all.ps1"
# Membuat virtualenv di audit\.venv kalau belum ada. Tidak mengubah file teman.
$ErrorActionPreference = "Stop"
$audit = $PSScriptRoot
$root = Split-Path $audit -Parent
$py = Join-Path $audit ".venv\Scripts\python.exe"
$env:PYTHONDONTWRITEBYTECODE = "1"
$env:PYTHONIOENCODING = "utf-8"

if (-not (Test-Path $py)) {
    py -3 -m venv (Join-Path $audit ".venv")
    & $py -m pip install -q pandas numpy scipy openpyxl
}

Push-Location $root   # model_dss.py membaca "kos_scored.csv" relatif ke folder kerja
try {
    Write-Host "== model_dss.py (asli, tanpa diubah) ==" ; & $py model_dss.py
    Write-Host "`n== golden_test.py ==" ; & $py (Join-Path $audit "golden_test.py")
    Write-Host "`n== audit_data.py ==" ; & $py (Join-Path $audit "audit_data.py") | Out-Null
    Write-Host "   -> audit\out\data.txt"
    Write-Host "`n== bandingkan.py ==" ; & $py (Join-Path $audit "bandingkan.py") | Out-Null
    Write-Host "   -> audit\out\bandingkan.txt"
    Write-Host "`n== sensitivitas.py (~30 detik) ==" ; & $py (Join-Path $audit "sensitivitas.py") | Out-Null
    Write-Host "   -> audit\out\sensitivitas.txt"
} finally {
    Pop-Location
}
