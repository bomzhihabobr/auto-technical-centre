import logging
import asyncio
import os
import random
from pathlib import Path
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
import pytz

from aiogram import Bot, Dispatcher, types, F, html
from aiogram.filters import Command, StateFilter
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.fsm.storage.memory import MemoryStorage
from aiogram.types import (
    InlineKeyboardMarkup, ReplyKeyboardMarkup, ReplyKeyboardRemove, KeyboardButton,
    InlineKeyboardButton, Message
)
from aiogram.utils.markdown import hbold, hlink
from dotenv import load_dotenv, dotenv_values

from models import Hall, Movie, Screening, Booking, UserData
from nlp_processor import NLProcessor
from config import HALLS, MOVIES, SCREENING_TIMES, SCHEDULE_DAYS

# Настройка логирования
os.makedirs('logs', exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/cinema_bot.log', encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Состояния бота
class BookingState(StatesGroup):
    waiting_for_movie = State()
    waiting_for_date = State()
    waiting_for_time = State()
    waiting_for_seats = State()
    confirm_booking = State()

# Класс для управления данными кинотеатра
class CinemaManager:
    def __init__(self):
        self.halls: Dict[str, Hall] = {}
        self.movies: Dict[str, Movie] = {}
        self.screenings: Dict[str, Screening] = {}
        self.bookings: Dict[str, Booking] = {}
        self.users: Dict[int, UserData] = {}
        self._init_data()
    
    def _init_data(self):
        # Инициализация залов
        for hall_id, hall_data in HALLS.items():
            self.halls[hall_id] = Hall(
                name=hall_data["name"],
                capacity=hall_data["capacity"],
                description=hall_data["description"],
                room_type=hall_data.get("room_type", "movie"),
                activities=hall_data.get("activities", []),
                slot_duration_minutes=hall_data.get("slot_duration_minutes", 60),
            )
        
        # Инициализация фильмов
        for movie_id, movie_data in MOVIES.items():
            self.movies[movie_id] = Movie(
                title=movie_data["title"],
                duration=movie_data["duration"],
                description=movie_data["description"],
                age_restriction=movie_data["age_restriction"],
                genres=movie_data.get("genres", []),
                director=movie_data.get("director", ""),
                actors=movie_data.get("actors", [])
            )
        
        # Создаем сеансы на ближайшие дни
        now = datetime.now(pytz.utc)
        for i in range(SCHEDULE_DAYS):
            date = now + timedelta(days=i)
            
            # Для каждого КИНО-зала создаем несколько сеансов в день
            for hall_id, hall in self.halls.items():
                # Создаем сеансы только для залов типа "movie"
                if HALLS.get(hall_id, {}).get("room_type", "movie") != "movie":
                    continue
                for time_str in SCREENING_TIMES:
                    # Преобразуем время из строки в часы и минуты
                    hour, minute = map(int, time_str.split(":"))
                    start_time = date.replace(hour=hour, minute=minute, second=0, microsecond=0)
                    
                    # Пропускаем прошедшие сеансы
                    if start_time < now:
                        continue
                    
                    # Выбираем случайный фильм
                    movie = random.choice(list(self.movies.values()))
                    
                    # Создаем ID сеанса
                    screening_id = f"{hall_id}_{start_time.strftime('%Y%m%d%H%M')}"
                    
                    # Определяем цену на основе базовой цены зала и продолжительности фильма
                    base_price = HALLS[hall_id]["base_price"]
                    duration_factor = movie.duration / 120  # Нормализуем к 2 часам
                    price = round(base_price * (1 + duration_factor * 0.5), -1)  # Увеличиваем цену за длительность
                    
                    # Создаем сеанс
                    self.screenings[screening_id] = Screening(
                        movie_title=movie.title,
                        hall_name=hall.name,
                        start_time=start_time,
                        end_time=start_time + timedelta(minutes=movie.duration + 30),  # +30 мин на уборку
                        price=float(price),
                        available_seats=hall.capacity
                    )

# Инициализация бота
# Явно загружаем .env из директории скрипта
env_path = Path(__file__).with_name('.env')
load_dotenv(dotenv_path=env_path, override=True)
# Fallback: read directly from file if environment var missing
env_kv = {}
try:
    env_kv = dotenv_values(env_path)
except Exception:
    env_kv = {}
token = os.getenv('TELEGRAM_API_KEY') or env_kv.get('TELEGRAM_API_KEY')
if not token:
    raise RuntimeError("TELEGRAM_API_KEY is not set. Create bot/.env with TELEGRAM_API_KEY=YOUR_TOKEN")
bot = Bot(token=token)
dp = Dispatcher(storage=MemoryStorage())

# Initialize cinema and NLP processor after class definitions
cinema = CinemaManager()
nlp = NLProcessor(cinema)

# Обработка текстовых сообщений с естественным языком
@dp.message(F.text)
async def handle_text(message: types.Message, state: FSMContext = None):
    text = message.text.lower().strip()
    current_state = await state.get_state() if state else None
    
    # Обработка приветствий
    if any(word in text for word in ["привет", "здравств", "добрый день", "добрый вечер", "доброе утро", "хай", "прив"]):
        greetings = [
            "Привет! 😊 Рад вас видеть! Чем могу помочь?",
            "Здравствуйте! Я кинобот, помогу с выбором фильма. Что вас интересует?",
            "Приветствую! Готов помочь с бронированием билетов. Какой фильм хотите посмотреть?",
            "Добрый день! Сегодня у нас отличная подборка фильмов. Что бы вы хотели посмотреть?"
        ]
        await message.answer(random.choice(greetings))
        return
        
    # Обработка отмены
    if text in ['отмена', 'отменить', 'назад'] and current_state:
        await state.clear()
        await message.answer("Действие отменено.", reply_markup=ReplyKeyboardRemove())
        return
        
    # Благодарности
    if any(word in text for word in ["спасибо", "благодар", "отличн"]):
        responses = [
            "Всегда пожалуйста! Обращайтесь ещё! 😊",
            "Рад был помочь! Приходите ещё!",
            "Пожалуйста! Приятного просмотра! 🍿"
        ]
        await message.answer(random.choice(responses))
        return
    
    # Обработка естественного языка
    try:
        booking_info = nlp.extract_booking_info(text)

        # Если пользователь нажал кнопку с названием комнаты — зафиксируем выбор и уберём клавиатуру
        selected = next(((hid, h) for hid, h in cinema.halls.items()
                         if h.name.lower() == text or hid.lower() == text), None)
        if selected:
            hid, hall = selected
            # Попробуем взять ранее распознанные данные (дата/время/длительность), если они есть в состоянии
            reuse_info = {}
            if state:
                data = await state.get_data()
                reuse_info = data.get('pending_booking', {}) or {}
            # Сформируем ответ с учётом уже распознанных параметров
            time_txt = None
            dur_txt = None
            if reuse_info.get('time'):
                try:
                    dt = reuse_info['time']
                    time_txt = dt.strftime('%d.%m %H:%M')
                except Exception:
                    pass
            if reuse_info.get('duration_minutes'):
                dm = reuse_info['duration_minutes']
                if dm % 60 == 0:
                    dur_txt = f"{dm // 60} ч"
                else:
                    dur_txt = f"{dm} мин"

            if time_txt:
                # Дружелюбное подтверждение бронирования с адресом
                extra = f" Длительность: {dur_txt}." if dur_txt else ""
                confirm = (
                    f"Хорошо! {hall.name}, {time_txt}.{extra} "
                    f"Мы вас ждём по адресу Туркестан 32, Кинорум Oscar.\n"
                    f"Если нужно изменить — просто напишите новое время/длительность."
                ).strip()
                await message.answer(confirm, reply_markup=ReplyKeyboardRemove())
            else:
                await message.answer(
                    f"Вы выбрали: {hall.name}. Укажите дату/время и длительность (например: 'сегодня в 20:00 на 2 часа').",
                    reply_markup=ReplyKeyboardRemove()
                )
            return
        
        # НЕКИНО АКТИВНОСТИ: karaoke/music/gaming/room
        act = booking_info.get('activity_type')
        if act and act != 'movie':
            # Подбор доступных комнат по типу
            matched_rooms = [
                (hid, hall) for hid, hall in cinema.halls.items()
                if HALLS.get(hid, {}).get('room_type') == act
            ]
            # Если задано число людей — фильтруем по вместимости
            if booking_info.get('seats') and matched_rooms:
                need = booking_info['seats']
                matched_rooms = [(hid,h) for hid,h in matched_rooms if h.capacity >= need]
            if not matched_rooms:
                await message.answer("Пока нет доступных комнат для этой активности. Попробуйте позже или выберите другую активность.")
                return
            # Клавиатура с названиями комнат
            kb = ReplyKeyboardMarkup(
                keyboard=[[KeyboardButton(text=h.name)] for _, h in matched_rooms],
                resize_keyboard=True,
                one_time_keyboard=True
            )
            details = "\n".join([
                f"• {h.name} — до {h.capacity} гостей, слот {h.slot_duration_minutes} мин." for _, h in matched_rooms
            ])
            msg = """
🎉 Отличный выбор! Доступные комнаты:
{details}

Укажите, пожалуйста, дату/время и желаемую длительность (например: "сегодня в 20:00 на 2 часа").
            """.strip().format(details=details)
            # Сохраним распознанную информацию, чтобы при выборе комнаты не спрашивать её заново
            if state:
                await state.update_data(pending_booking=booking_info)
            await message.answer(msg, reply_markup=kb)
            return
        
        if booking_info.get('movie'):
            # Обработка запроса о фильме
            response = f"🔍 Отлично! Вы выбрали фильм *{booking_info['movie']}*"
            if booking_info.get('date'):
                response += f" на {booking_info['date']}"
            if booking_info.get('time'):
                response += f" в {booking_info['time']}"
            if booking_info.get('seats'):
                response += f"\n🎟️ Количество мест: {booking_info['seats']}"
                
            response += "\n\nПродолжить бронирование? (да/нет)"
            await message.answer(response, parse_mode='Markdown')
            return
            
    except Exception as e:
        logger.error(f"Error processing message: {e}")
    
    # Если не распознан запрос
    help_responses = [
        "Извините, я не совсем понял ваш запрос. Вы можете спросить так:\n• \"Какие фильмы идут сегодня?\"\n• \"Хочу забронировать билеты на Матрицу\"\n• \"Какие есть сеансы на завтра?\"",
        "Пока не понимаю, что вы имеете в виду. Вот что я умею:\n• Показать фильмы: /movies\n• Помочь с бронированием: /book\n• Ответить на вопросы о сеансах",
        "Простите, я не совсем вас понял. Попробуйте уточнить, например:\n• \"Какие комедии идут в прокате?\"\n• \"Есть ли сеансы после 18:00?\"\n• \"Забронируйте 2 места на Джокер\"",
        "Кажется, я не расслышал. Вот что я могу для вас сделать:\n• Показать афишу (/movies)\n• Помочь с выбором фильма\n• Забронировать билеты (/book)\n\nМожете задать вопрос по-другому?"
    ]
    await message.answer(random.choice(help_responses))

async def process_movie_selection(message: types.Message, state: FSMContext, booking_info: dict):
    """Обработка выбора фильма"""
    movie_title = booking_info['movie']
    await state.update_data(movie=movie_title)
    
    if booking_info['date'] or booking_info['time']:
        # Если указана дата/время, ищем ближайший сеанс
        target_time = booking_info['time'] or booking_info['date']
        screening_info = nlp.find_closest_screening(
            movie_title, 
            target_time,
            booking_info.get('hall')
        )
        
        if screening_info:
            await state.update_data(
                screening_id=screening_info['screening'].id,
                seats=booking_info.get('seats', 1)
            )
            
            if booking_info.get('seats'):
                # Если указано количество мест, переходим к подтверждению
                await confirm_booking(message, state)
            else:
                # Иначе запрашиваем количество мест
                await message.answer(
                    f"Найден сеанс:\n{format_screening(screening_info['screening'])}\n\n"
                    "Сколько мест вы хотите забронировать?",
                    reply_markup=get_seats_keyboard()
                )
                await state.set_state(BookingState.waiting_for_seats)
            return
    
    # Если не нашли подходящий сеанс или не указано время, запрашиваем дату
    await message.answer(
        f"Вы выбрали фильм: <b>{movie_title}</b>\n"
        "На какую дату вы хотите забронировать билеты?",
        reply_markup=get_dates_keyboard(),
        parse_mode="HTML"
    )
    await state.set_state(BookingState.waiting_for_date)

async def process_booking_flow(message: types.Message, state: FSMContext, text: str, booking_info: dict):
    """Обработка потока бронирования"""
    current_state = await state.get_state()
    data = await state.get_data()
    
    if current_state == BookingState.waiting_for_date.state:
        await process_date_selection(message, state, text, data)
    elif current_state == BookingState.waiting_for_time.state:
        await process_time_selection(message, state, text, data)
    elif current_state == BookingState.waiting_for_seats.state:
        await process_seats_selection(message, state, text, data)
    elif current_state == BookingState.confirm_booking.state:
        await process_booking_confirmation(message, state, text, data)

# Обработчики команд
@dp.message(Command("start"))
async def cmd_start(message: types.Message):
    welcome_text = """
🎬 *Добро пожаловать в кинотеатр «Бомжара»!*

Я ваш виртуальный помощник по бронированию билетов. Вот что я умею:

• Показать список фильмов: /movies
• Забронировать билеты: /book
• Помощь: /help

Вы можете писать мне как обычным текстом, например:
• "Какие фильмы идут сегодня?"
• "Хочу забронировать билеты на Матрицу"
• "Какие есть сеансы на завтра?"

Чем могу помочь? 😊
    """
    # Отправляем приветственное сообщение
    await message.answer(welcome_text, parse_mode='Markdown')
    
    # Дополнительная информация о командах
    commands_info = (
        "🎟 *Доступные команды:*\n"
        "/movies - Список фильмов\n"
        "/book - Начать бронирование\n"
        "/help - Помощь"
    )
    await message.answer(commands_info, parse_mode='Markdown')

@dp.message(Command("rooms"))
async def cmd_rooms(message: types.Message):
    """Показать список комнат КиноРУМа (фильм/караоке/музыка/игровая)"""
    if not cinema.halls:
        await message.answer("Сейчас комнаты недоступны.")
        return
    groups = { 'movie': [], 'karaoke': [], 'music': [], 'gaming': [], 'party': [] }
    for hid, hall in cinema.halls.items():
        rtype = HALLS.get(hid, {}).get('room_type', 'movie')
        if rtype not in groups:
            groups[rtype] = []
        groups[rtype].append(hall)
    text_parts = []
    titles = {
        'movie': 'Кинозалы', 'karaoke': 'Караоке', 'music': 'Музыкальные', 'gaming': 'Игровые', 'party': 'Party', 'room': 'Комнаты'
    }
    for rtype, halls in groups.items():
        if not halls:
            continue
        text_parts.append(f"<b>{titles.get(rtype, rtype.title())}</b>:")
        for h in halls:
            text_parts.append(f"• {h.name} — до {h.capacity} гостей; слот {h.slot_duration_minutes} мин.")
    await message.answer("\n".join(text_parts), parse_mode='HTML')

@dp.message(Command("movies"))
async def cmd_movies(message: types.Message):
    """Показать список доступных фильмов"""
    if not cinema.movies:
        await message.answer("К сожалению, сейчас нет доступных фильмов.")
        return
    
    movies_text = "🎥 Доступные фильмы:\n\n"
    for movie in cinema.movies.values():
        movies_text += (
            f"<b>{movie.title}</b> ({movie.age_restriction})\n"
            f"⏱ {movie.duration} мин.\n"
            f"{movie.description}\n\n"
        )
    
    await message.answer(movies_text, parse_mode="HTML")

@dp.message(Command("book"))
async def cmd_book(message: types.Message, state: FSMContext):
    """Начать процесс бронирования"""
    # Создаем клавиатуру с доступными фильмами
    keyboard = ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text=movie.title)] 
            for movie in cinema.movies.values()
        ],
        resize_keyboard=True,
        one_time_keyboard=True
    )
    
    await message.answer("🎬 Выберите фильм:", reply_markup=keyboard)
    await state.set_state(BookingState.waiting_for_movie)

# Запуск бота
async def main():
    logger.info("Starting cinema bot...")
    await dp.start_polling(bot, skip_updates=True)

if __name__ == "__main__":
    import asyncio
    import random
    
    # Создаем директорию для логов, если её нет
    os.makedirs("logs", exist_ok=True)
    
    # Настройка логирования в файл
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler("logs/cinema_bot.log"),
            logging.StreamHandler()
        ]
    )
    
    # Запуск бота
    try:
        asyncio.run(main())
    except (KeyboardInterrupt, SystemExit):
        logging.info("Bot stopped")
