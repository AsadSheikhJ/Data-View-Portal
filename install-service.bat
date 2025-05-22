@echo off
echo Installing Node.js application as a service...

:: Change to the directory where the BAT file is located
cd /d "%~dp0"

:: Path to nssm.exe - update this with your actual path after downloading
set NSSM_PATH=C:\Users\asad.jamal\Downloads\nssm-2.24\nssm-2.24\win64\nssm.exe

:: Install the service
%NSSM_PATH% install NodeAppService "C:\Program Files\nodejs\node.exe" "%~dp0combined-start.js"
%NSSM_PATH% set NodeAppService DisplayName "Node.js Application Service"
%NSSM_PATH% set NodeAppService Description "Runs the Node.js application as a Windows service"
%NSSM_PATH% set NodeAppService AppDirectory "%~dp0"
%NSSM_PATH% start NodeAppService

echo Service installed and started successfully.
pause
