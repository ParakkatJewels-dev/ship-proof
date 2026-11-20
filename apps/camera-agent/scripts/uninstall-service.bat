@echo off
echo ========================================================
echo Removing ShipProof Camera Agent Windows Service
echo ========================================================

nssm stop ShipProofCameraAgent
nssm remove ShipProofCameraAgent confirm

echo [SUCCESS] Service uninstalled.
pause
