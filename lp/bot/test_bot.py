import asyncio
from aiogram import Bot, Dispatcher, types
from aiogram.filters import Command
from aiogram.types import ReplyKeyboardMarkup, KeyboardButton

# Тестовый токен бота (замените на реальный при тестировании)
TEST_TOKEN = "YOUR_TEST_BOT_TOKEN"

# Создаем бота и диспетчер
bot = Bot(token=TEST_TOKEN)
dp = Dispatcher()

@dp.message(Command("start"))
async def cmd_start(message: types.Message):
    """Обработчик команды /start"""
    await message.answer(
        "Привет! Это тестовый бот для кинотеатра.\n"
        "Вы можете протестировать следующие команды:\n"
        "/start - Начать работу с ботом\n"
        "/movies - Показать список фильмов\n"
        "/book - Начать бронирование\n"
        "\nИли просто напишите что-то вроде:\n"
        "• Хочу забронировать билеты на Матрицу\n"
        "• Какие фильмы идут завтра?\n"
        "• Забронируйте 2 места на 19:00"
    )

@dp.message(Command("movies"))
async def cmd_movies(message: types.Message):
    """Показать список фильмов"""
    movies = [
        "🎬 Матрица (16+)",
        "🎬 Начало (12+)",
        "🎬 Интерстеллар (12+)"
    ]
    await message.answer("Доступные фильмы:\n" + "\n".join(movies))

@dp.message(Command("book"))
async def cmd_book(message: types.Message):
    """Начать процесс бронирования"""
    keyboard = ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text="Матрица")],
            [KeyboardButton(text="Начало")],
            [KeyboardButton(text="Интерстеллар")]
        ],
        resize_keyboard=True
    )
    await message.answer("Выберите фильм:", reply_markup=keyboard)

@dp.message()
async def echo(message: types.Message):
    """Эхо-ответ для тестирования"""
    text = message.text.lower()
    if "привет" in text:
        await message.answer("Привет! Как я могу вам помочь?")
    elif "спасибо" in text:
        await message.answer("Пожалуйста! Обращайтесь ещё!")
    elif "пока" in text or "до свидания" in text:
        await message.answer("До свидания! Хорошего дня!")
    else:
        await message.answer(f"Вы написали: {message.text}")

async def main():
    # Запускаем бота
    await dp.start_polling(bot)

if __name__ == "__main__":
    print("Бот запущен. Нажмите Ctrl+C для остановки.")
    asyncio.run(main())
