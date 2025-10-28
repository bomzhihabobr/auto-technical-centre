# Кинотеатр Бот

Этот бот помогает пользователям бронировать билеты в кинотеатре с помощью естественного языка.

## Возможности
- Бронирование билетов с помощью голосовых команд
- Просмотр доступных фильмов и сеансов
- Интерактивное меню для удобного выбора
- Поддержка естественного языка (NLP)
- Управление бронированием

## Команды
- `/start` - Начать работу с ботом
- `/movies` - Показать список доступных фильмов
- `/book` - Начать процесс бронирования

## Примеры использования
- "Хочу забронировать билеты на Матрицу"
- "Какие фильмы идут сегодня?"
- "Забронируйте 2 места на 19:00"
- "Покажите сеансы на завтра"

## Установка и настройка

1. Установите Python 3.8 или выше с [официального сайта](https://www.python.org/downloads/)
2. Установите зависимости:
   ```bash
   pip install -r requirements.txt
   ```
3. Создайте файл `.env` в корне проекта со следующим содержимым:
   ```
   TELEGRAM_API_KEY=ваш_токен_бота
   ```
   (Получите токен у [@BotFather](https://t.me/botfather))

## Запуск бота

1. Запустите основной бот:
   ```bash
   python bot/cinema_bot.py
   ```

   Или тестового бота:
   ```bash
   python bot/test_bot.py
   ```

## Структура проекта

- `bot/` - Основная директория с ботом
  - `cinema_bot.py` - Основной файл бота
  - `nlp_processor.py` - Обработка естественного языка
  - `booking_handlers.py` - Обработчики бронирования
  - `test_bot.py` - Тестовый бот для отладки
  - `requirements.txt` - Зависимости Python
- `.env` - Переменные окружения
- `README.md` - Этот файл

## Логирование

Логи сохраняются в папке `logs/cinema_bot.log`

## Лицензия

Этот проект распространяется под лицензией MIT. Подробнее см. в файле [LICENSE](LICENSE).

## Благодарности

- [aiogram](https://docs.aiogram.dev/) - Асинхронный фреймворк для Telegram ботов
- [pydantic](https://pydantic-docs.helpmanual.io/) - Валидация данных
- [python-dotenv](https://pypi.org/project/python-dotenv/) - Загрузка переменных окружения

## Notes
- The bot maintains conversation context using the last 5 message pairs
- Responses are generated using Google's Gemini Pro model
- All errors are logged for debugging purposes
