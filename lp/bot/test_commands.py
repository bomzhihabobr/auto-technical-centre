"""
Скрипт для тестирования команд бота.
Запускает тестовый сценарий взаимодействия с ботом.
"""
import asyncio
import os
from datetime import datetime, timedelta

from aiogram import Bot, Dispatcher, types
from aiogram.filters import Command
from aiogram.types import ReplyKeyboardMarkup, KeyboardButton

# Настройки тестирования
TEST_USER_ID = 123456789  # Замените на ваш ID в Telegram
TEST_BOT_TOKEN = "YOUR_TEST_BOT_TOKEN"  # Тестовый токен бота

# Создаем бота и диспетчер
bot = Bot(token=TEST_BOT_TOKEN)
dp = Dispatcher()

async def send_test_commands():
    """Отправляет тестовые команды боту"""
    # Команды для тестирования
    commands = [
        "/start",
        "Привет! Хочу забронировать билеты",
        "Матрица",
        "Сегодня",
        "19:00",
        "2",
        "Да, подтверждаю"
    ]
    
    print("Начинаем тестирование бота...\n")
    
    # Отправляем команды с задержкой
    for cmd in commands:
        print(f"Отправка команды: {cmd}")
        await bot.send_message(chat_id=TEST_USER_ID, text=cmd)
        await asyncio.sleep(1)  # Небольшая задержка между командами
    
    print("\nТестирование завершено! Проверьте чат с ботом.")

async def main():
    """Основная функция"""
    # Проверяем токен
    if TEST_BOT_TOKEN == "YOUR_TEST_BOT_TOKEN":
        print("Ошибка: Укажите ваш тестовый токен бота в переменной TEST_BOT_TOKEN")
        return
    
    # Запускаем тестирование
    try:
        await send_test_commands()
    except Exception as e:
        print(f"Произошла ошибка: {e}")
    finally:
        # Закрываем сессию бота
        await bot.session.close()

if __name__ == "__main__":
    asyncio.run(main())
