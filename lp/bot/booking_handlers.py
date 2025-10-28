from datetime import datetime, timedelta
from typing import Dict, Any, Optional
import re
import pytz

from aiogram import types
from aiogram.fsm.context import FSMContext

from cinema_bot import (
    BookingState, cinema, format_screening, 
    get_times_keyboard, get_seats_keyboard, 
    get_dates_keyboard, bot, Booking, Screening
)

# Обработка выбора даты
async def process_date_selection(message: types.Message, state: FSMContext, text: str, data: Dict[str, Any]):
    """Обработка выбора даты"""
    if 'сегодня' in text.lower():
        selected_date = datetime.now(pytz.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    elif 'завтра' in text.lower():
        selected_date = (datetime.now(pytz.utc) + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
    elif 'послезавтра' in text.lower():
        selected_date = (datetime.now(pytz.utc) + timedelta(days=2)).replace(hour=0, minute=0, second=0, microsecond=0)
    else:
        date_match = re.search(r'(\d{1,2})[./](\d{1,2})(?:[./](\d{2,4}))?', text)
        if date_match:
            day, month, year = date_match.groups()
            year = int(year or datetime.now().year)
            if year < 100:  # Двухзначный год
                year += 2000 if year < 50 else 1900
            try:
                selected_date = datetime(year, int(month), int(day), tzinfo=pytz.utc)
            except ValueError:
                await message.answer("Пожалуйста, введите корректную дату.", reply_markup=get_dates_keyboard())
                return
        else:
            await message.answer("Пожалуйста, выберите дату из предложенных или введите в формате ДД.ММ.ГГГГ", 
                               reply_markup=get_dates_keyboard())
            return
    
    await state.update_data(selected_date=selected_date)
    
    await message.answer(
        f"Выбрана дата: {selected_date.strftime('%d.%m.%Y')}\n"
        "Выберите время сеанса:",
        reply_markup=get_times_keyboard()
    )
    await state.set_state(BookingState.waiting_for_time)

# Обработка выбора времени
async def process_time_selection(message: types.Message, state: FSMContext, text: str, data: Dict[str, Any]):
    """Обработка выбора времени"""
    time_match = re.search(r'(\d{1,2})[.:]?(\d{2})?', text)
    
    if time_match:
        hours = int(time_match.group(1))
        minutes = int(time_match.group(2) or 0)
        
        # Получаем выбранную дату из состояния
        state_data = await state.get_data()
        selected_date: datetime = state_data.get('selected_date')
        
        if not selected_date:
            await message.answer("Пожалуйста, начните процесс бронирования заново.")
            await state.clear()
            return
            
        # Создаем объект datetime с выбранным временем
        selected_time = selected_date.replace(hour=hours, minute=minutes, second=0, microsecond=0)
        
        # Ищем ближайший сеанс
        movie_title = state_data.get('movie')
        screening = find_closest_screening(movie_title, selected_time)
        
        if screening and (screening.start_time - selected_time).total_seconds() < 3600:  # В пределах часа
            await state.update_data(
                screening_id=screening.id,
                selected_time=selected_time
            )
            
            # Запрашиваем количество мест
            await message.answer(
                f"Выбран сеанс:\n{format_screening(screening)}\n\n"
                "Сколько мест вы хотите забронировать?",
                reply_markup=get_seats_keyboard()
            )
            await state.set_state(BookingState.waiting_for_seats)
        else:
            await message.answer(
                "К сожалению, на выбранное время нет доступных сеансов. "
                "Пожалуйста, выберите другое время.",
                reply_markup=get_times_keyboard()
            )
    else:
        await message.answer(
            "Пожалуйста, выберите время из предложенных или введите в формате ЧЧ:ММ",
            reply_markup=get_times_keyboard()
        )

def find_closest_screening(movie_title: str, target_time: datetime) -> Optional[Screening]:
    """Найти ближайший сеанс для фильма"""
    closest = None
    min_diff = float('inf')
    
    for screening in cinema.screenings.values():
        if screening.movie_title != movie_title:
            continue
            
        time_diff = abs((screening.start_time - target_time).total_seconds())
        
        if time_diff < min_diff:
            min_diff = time_diff
            closest = screening
    
    return closest if min_diff < 3600 else None  # В пределах часа

# Обработка выбора количества мест
async def process_seats_selection(message: types.Message, state: FSMContext, text: str, data: Dict[str, Any]):
    """Обработка выбора количества мест"""
    seats_match = re.search(r'\d+', text)
    
    if seats_match:
        seats = int(seats_match.group(0))
        if 1 <= seats <= 10:  # Ограничиваем максимальное количество мест
            await state.update_data(seats=seats)
            await confirm_booking(message, state)
        else:
            await message.answer(
                "Пожалуйста, укажите количество мест от 1 до 10.",
                reply_markup=get_seats_keyboard()
            )
    else:
        await message.answer(
            "Пожалуйста, укажите количество мест цифрой.",
            reply_markup=get_seats_keyboard()
        )

# Подтверждение бронирования
async def confirm_booking(message: types.Message, state: FSMContext):
    """Подтверждение бронирования"""
    data = await state.get_data()
    screening_id = data.get('screening_id')
    seats = data.get('seats', 1)
    
    if not screening_id:
        await message.answer("Произошла ошибка. Пожалуйста, начните бронирование заново.")
        await state.clear()
        return
    
    # Получаем информацию о сеансе
    screening = cinema.screenings.get(screening_id)
    if not screening:
        await message.answer("Извините, выбранный сеанс больше не доступен.")
        await state.clear()
        return
    
    # Проверяем доступность мест
    hall = cinema.halls[screening.hall_name]
    booked_seats = sum(
        b.seats for b in cinema.bookings.values() 
        if b.screening_id == screening_id and b.status != "cancelled"
    )
    
    if booked_seats + seats > hall.capacity:
        await message.answer(
            f"К сожалению, осталось только {hall.capacity - booked_seats} мест. "
            "Пожалуйста, выберите меньшее количество мест.",
            reply_markup=get_seats_keyboard()
        )
        await state.set_state(BookingState.waiting_for_seats)
        return
    
    # Показываем подтверждение
    await message.answer(
        f"Подтвердите бронирование:\n"
        f"🎬 Фильм: <b>{screening.movie_title}</b>\n"
        f"📅 Дата и время: {screening.start_time.strftime('%d.%m.%Y %H:%M')}\n"
        f"📍 Зал: {hall.name}\n"
        f"💺 Количество мест: {seats}\n"
        f"💰 Сумма к оплате: {screening.price * seats} руб.\n\n"
        "Подтверждаете бронирование?",
        parse_mode="HTML",
        reply_markup=types.ReplyKeyboardMarkup(
            keyboard=[
                [types.KeyboardButton(text="✅ Да, подтверждаю")],
                [types.KeyboardButton(text="❌ Отменить")]
            ],
            resize_keyboard=True
        )
    )
    await state.set_state(BookingState.confirm_booking)

# Обработка подтверждения бронирования
async def process_booking_confirmation(message: types.Message, state: FSMContext, text: str, data: Dict[str, Any]):
    """Обработка подтверждения бронирования"""
    if 'да' in text.lower() or 'подтверждаю' in text.lower():
        # Создаем бронирование
        data = await state.get_data()
        screening_id = data.get('screening_id')
        seats = data.get('seats', 1)
        
        if not screening_id:
            await message.answer("Произошла ошибка. Пожалуйста, начните бронирование заново.")
            await state.clear()
            return
        
        # Создаем новое бронирование
        booking_id = f"{message.from_user.id}_{int(datetime.utcnow().timestamp())}"
        booking = Booking(
            user_id=message.from_user.id,
            screening_id=screening_id,
            seats=seats,
            status="confirmed"
        )
        
        cinema.bookings[booking_id] = booking
        
        # Получаем информацию о сеансе
        screening = cinema.screenings[screening_id]
        hall = cinema.halls[screening.hall_name]
        
        # Отправляем подтверждение
        await message.answer(
            "✅ Бронирование успешно создано!\n\n"
            f"Номер брони: <code>{booking_id}</code>\n"
            f"🎬 Фильм: <b>{screening.movie_title}</b>\n"
            f"📅 Дата и время: {screening.start_time.strftime('%d.%m.%Y %H:%M')}\n"
            f"📍 Зал: {hall.name}\n"
            f"💺 Мест: {seats}\n"
            f"💰 Сумма к оплате: {screening.price * seats} руб.\n\n"
            "Приходите за 15 минут до начала сеанса. Хорошего просмотра! 🍿",
            parse_mode="HTML",
            reply_markup=types.ReplyKeyboardRemove()
        )
        
        # Очищаем состояние
        await state.clear()
        
    elif 'нет' in text.lower() or 'отмена' in text.lower() or 'отменить' in text.lower():
        await message.answer("Бронирование отменено.", reply_markup=types.ReplyKeyboardRemove())
        await state.clear()
    else:
        await message.answer("Пожалуйста, подтвердите или отмените бронирование.")
