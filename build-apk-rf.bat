@echo off
REM Build signed split APKs from the short C:\rf junction to avoid Windows long-path errors.
REM This junction must exist: C:\rf -> C:\Users\BELINZE NEWTONE\Music\RFINAL

cd /d C:\rf
if errorlevel 1 (
  echo ERROR: Could not switch to C:\rf. Make sure the junction exists.
  pause
  exit /b 1
)

npm run build:android:apk -- --no-clean
pause
