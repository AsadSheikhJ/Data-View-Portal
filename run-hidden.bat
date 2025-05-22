@echo off
:: Change to the directory where the BAT file is located
cd /d "%~dp0"

:: Create a temporary VBS file
echo Set WshShell = CreateObject("WScript.Shell") > "%TEMP%\temp_runner.vbs"
echo WshShell.Run """C:\Program Files\nodejs\node.exe"" ""%~dp0combined-start.js""", 0, False >> "%TEMP%\temp_runner.vbs"

:: Run the temporary VBS file
wscript.exe "%TEMP%\temp_runner.vbs"

:: Delete the temporary file
del "%TEMP%\temp_runner.vbs"

exit
