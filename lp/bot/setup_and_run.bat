@echo off
echo Установка необходимых зависимостей...
pip install -r requirements.txt

if not exist .env (
    echo Создание файла .env...
    echo TELEGRAM_API_KEY=ваш_токен_бота > .env
    echo Файл .env создан. Пожалуйста, укажите ваш токен бота в этом файле.
    pause
    exit /b
)

echo Запуск бота...
python cinema_bot.py
