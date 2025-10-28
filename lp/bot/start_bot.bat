@echo off
echo Stopping any existing Python processes...
taskkill /F /IM python.exe >nul 2>&1
timeout /t 2 >nul
echo Starting the bot...
python telegram_bot.py
pause
