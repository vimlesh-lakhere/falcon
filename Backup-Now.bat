@echo off
title Falcon - Backup to Google Drive
color 0A
echo.
echo   ============================================================
echo      FALCON - BACKUP TO GOOGLE DRIVE
echo   ============================================================
echo.
echo   Backing up data + all product images to Google Drive...
echo   Please wait a few seconds (do NOT close this window).
echo.

call "%~dp0scripts\weekly-backup.bat"

echo.
echo   ============================================================
echo      [ DONE ]  Backup complete.
echo   ------------------------------------------------------------
echo      Saved locally :  backups\  (data JSON + product images)
echo      Google Drive  :  G:\My Drive\Falcon_Backups
echo   ============================================================
echo.
echo   --- Last few log lines ---
powershell -NoProfile -Command "Get-Content '%~dp0backups\backup-log.txt' -Tail 6"
echo.
echo   You can close this window now. Press any key to exit...
pause >nul
