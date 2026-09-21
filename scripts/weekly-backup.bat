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

REM ---- Mirror the backups off this PC to the cloud (Google Drive for Desktop) ----
REM Auto-detects Google Drive: it mounts as a drive letter with a "My Drive" folder. Once you
REM install "Google Drive for Desktop" and sign in, the next backup finds it automatically.
set "CLOUD="
for %%D in (G H I J K L M N O P Q R S T U V W X Y Z) do (
  if not defined CLOUD if exist "%%D:\My Drive\" set "CLOUD=%%D:\My Drive"
)
if not defined CLOUD if exist "%USERPROFILE%\My Drive\" set "CLOUD=%USERPROFILE%\My Drive"
if defined CLOUD (
  echo Mirroring to "%CLOUD%\Falcon_Backups" >> "backups\backup-log.txt"
  robocopy "backups" "%CLOUD%\Falcon_Backups" /MIR /NFL /NDL /NP /R:1 /W:1 >> "backups\backup-log.txt" 2>&1
) else (
  echo Google Drive not found yet - backup kept LOCAL only. Install "Google Drive for Desktop" and sign in to enable cloud sync. >> "backups\backup-log.txt"
)

echo ==== Falcon backup finished %date% %time% ==== >> "backups\backup-log.txt"
popd
endlocal
