@echo off
REM ============================================================================
REM  Falcon 360 - weekly auto-backup (wired to Windows Task Scheduler)
REM  Runs the data backup (JSON -> backups\, and Google Drive if configured) and
REM  the product-image backup (backups\products-images\). Appends to a log.
REM  Path-independent: works from wherever the repo lives.
REM ============================================================================
setlocal
pushd "%~dp0.."
if not exist "backups" mkdir "backups"
echo. >> "backups\backup-log.txt"
echo ==== Falcon backup started %date% %time% ==== >> "backups\backup-log.txt"
call node "scripts\backup-to-drive.js" >> "backups\backup-log.txt" 2>&1
call node "scripts\backup-images.js"   >> "backups\backup-log.txt" 2>&1

REM Mirror the backups off this PC to OneDrive (auto cloud copy) when OneDrive is present.
if exist "%OneDrive%\" (
  echo Mirroring to "%OneDrive%\Falcon_Backups" >> "backups\backup-log.txt"
  robocopy "backups" "%OneDrive%\Falcon_Backups" /MIR /NFL /NDL /NP /R:1 /W:1 >> "backups\backup-log.txt" 2>&1
) else if exist "%USERPROFILE%\OneDrive\" (
  echo Mirroring to "%USERPROFILE%\OneDrive\Falcon_Backups" >> "backups\backup-log.txt"
  robocopy "backups" "%USERPROFILE%\OneDrive\Falcon_Backups" /MIR /NFL /NDL /NP /R:1 /W:1 >> "backups\backup-log.txt" 2>&1
)

echo ==== Falcon backup finished %date% %time% ==== >> "backups\backup-log.txt"
popd
endlocal
