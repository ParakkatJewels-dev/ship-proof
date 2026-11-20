@echo off
echo ========================================================
echo Installing ShipProof Camera Agent as Windows Background Service
echo ========================================================

REM Requires NSSM (Non-Sucking Service Manager) or sc.exe
REM Download nssm from https://nssm.cc if not already available
where nssm >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] NSSM not found on PATH. Please download nssm.exe and place in C:\Windows\System32
    pause
    exit /b 1
)

nssm install ShipProofCameraAgent "%~dp0..\dist\index.js"
nssm set ShipProofCameraAgent AppDirectory "%~dp0.."
nssm set ShipProofCameraAgent Description "ShipProof Station Video Recording Agent"
nssm set ShipProofCameraAgent Start SERVICE_AUTO_START
nssm start ShipProofCameraAgent

echo [SUCCESS] ShipProof Camera Agent service installed and started!
pause
