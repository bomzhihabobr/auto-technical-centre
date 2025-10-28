import logging
from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import Command
from aiogram.enums import ParseMode
from aiogram.client.default import DefaultBotProperties
from aiogram.fsm.storage.memory import MemoryStorage
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from dotenv import load_dotenv
import os
import asyncio
import sys
import signal
from typing import Optional, Dict, Any, List
from transformers import AutoModelForCausalLM, AutoTokenizer
import torch

# Инициализация модели и токенизатора
MODEL_NAME = "sberbank-ai/rugpt3small_based_on_gpt2"

try:
    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
    model = AutoModelForCausalLM.from_pretrained(MODEL_NAME)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = model.to(device)
    model.eval()
    print(f"Модель {MODEL_NAME} загружена на устройство: {device}")
except Exception as e:
    print(f"Ошибка при загрузке модели: {e}")
    sys.exit(1)

# Загружаем токен бота из .env
from dotenv import dotenv_values

# Читаем напрямую из .env файла
env_vars = dotenv_values(os.path.join(os.path.dirname(__file__), '..', '.env'))
TELEGRAM_TOKEN = env_vars.get("TELEGRAM_API_KEY")

# Проверяем наличие обязательных переменных окружения
if not TELEGRAM_TOKEN:
    raise ValueError("Отсутствует обязательная переменная окружения: TELEGRAM_API_KEY")

# Отладочный вывод (первые 10 и последние 5 символов токена)
if TELEGRAM_TOKEN:
    masked_token = f"{TELEGRAM_TOKEN[:10]}...{TELEGRAM_TOKEN[-5:]}"
    print(f"Debug - TELEGRAM_TOKEN: {masked_token} (length: {len(TELEGRAM_TOKEN)})")
else:
    print("Debug - TELEGRAM_TOKEN is empty")

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("bot.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Выводим информацию о конфигурации
logger.info("Проверка конфигурации...")
logger.info(f"Длина TELEGRAM_TOKEN: {len(TELEGRAM_TOKEN) if TELEGRAM_TOKEN else 0} символов")

# Создаем экземпляры бота и диспетчера
bot = Bot(token=TELEGRAM_TOKEN, default=DefaultBotProperties(parse_mode=ParseMode.HTML))
storage = MemoryStorage()
dp = Dispatcher(storage=storage)

# Хранилище для контекста разговора
user_contexts = {}

def contains_technical_nonsense(text: str) -> bool:
    """Проверяет текст на наличие технических несоответствий"""
    # Неправильные технические термины
    invalid_tech_terms = [
        'ядерная видеокарта', 'видеокарта.*ядер', '\d+-хядерн', '\d+ ядерн[а-я]* видеокарт',
        'оперативн[а-я]*\s+памят[ьи]\s*[<>]?\s*\d+[гГ][бБ]?', '\d+[гГ][бБ]\s+оперативн',
        'видеопамят[ьи]\s*[<>]?\s*\d+[гГ][бБ]?', '\d+[гГ][бБ]\s+видеопамят',
        'процессор.*\d+\s*ядер[а-я]*', '\d+\s*ядерн[а-я]*\s+процессор'
    ]
    
    # Проверяем наличие несоответствий
    for pattern in invalid_tech_terms:
        import re
        if re.search(pattern, text, re.IGNORECASE):
            return True
    return False

def is_response_valid(response: str, prompt: str) -> bool:
    """Проверяет валидность сгенерированного ответа"""
    # Проверка на слишком короткий ответ
    if len(response) < 3:
        return False
        
    # Проверка на повторяющиеся слова или символы
    words = response.split()
    if len(set(words)) < len(words) * 0.5:  # Если много повторяющихся слов
        return False
        
    # Проверка на бессмысленные комбинации символов
    if any(seq in response.lower() for seq in ['xdxd', 'lol', 'haha', '...', '??', '!!']):
        return False
    
    # Проверка на технические несоответствия
    if contains_technical_nonsense(response):
        return False
        
    # Проверка на неполные или обрывистые фразы
    if response.count('(') != response.count(')') or response.count('[') != response.count(']'):
        return False
        
    # Проверка на слишком много специальных символов
    special_chars = sum(1 for c in response if not c.isalnum() and not c.isspace())
    if special_chars > len(response) * 0.3:  # Более 30% спецсимволов
        return False
        
    return True

def generate_fallback_response(prompt: str) -> str:
    """Генерирует запасной ответ, если основной не прошел валидацию"""
    import random
    
    # Более разнообразные фразы для разных ситуаций
    fallbacks = [
        # Общие фразы
        "Извините, я не совсем понял ваш вопрос. Можете переформулировать?",
        "К сожалению, я не могу дать точный ответ на этот вопрос.",
        "Давайте обсудим что-то другое. Что вас еще интересует?",
        "Я пока не могу ответить на этот вопрос. Может, зададите другой?",
        "Извините, я не уверен, что правильно вас понял. Уточните, пожалуйста.",
        
        # Технические вопросы
        "Мои знания по этой технической теме ограничены. Можете уточнить вопрос?",
        "Я не уверен в точности технических характеристик. Давайте обсудим что-то другое.",
        "К сожалению, я не могу предоставить точные технические спецификации.",
        
        # Общие ответы
        "Интересный вопрос! К сожалению, я не могу дать на него точный ответ.",
        "Спасибо за вопрос! К сожалению, я не обладаю достаточной информацией, чтобы ответить.",
        "Я бы хотел помочь, но мне не хватает информации для точного ответа."
    ]
    
    # Выбираем случайный ответ
    return random.choice(fallbacks)

def generate_response(prompt: str, context: Optional[str] = None, attempts: int = 3) -> str:
    """Сгенерировать ответ с помощью локальной модели с валидацией"""
    # Проверяем, не содержит ли сам запрос технических несоответствий
    if contains_technical_nonsense(prompt):
        return "Извините, но в вашем запросе содержатся некорректные технические данные. Пожалуйста, уточните вопрос."
        
    for attempt in range(attempts):
        try:
            # Системный промпт для лучшего поведения модели
            system_prompt = (
                "Ты - полезный, вежелательный и отзывчивый ассистент. "
                "Отвечай на русском языке. Будь краток, но информативен. "
                "Если не знаешь ответа, скажи об этом честно. "
                "Никогда не выдумывай технические характеристики. "
                "Если в запросе есть технические несоответствия, вежливо укажи на это. "
                "Будь точен в технических деталях. "
                "Избегай конкретных цифр в спецификациях, если они не указаны в вопросе.\n\n"
            )
            
            # Подготавливаем контекст
            history = system_prompt
            if context:
                history += context + "\n"
            
            # Формируем полный промпт с историей
            full_prompt = f"{history}Пользователь: {prompt}\nБот:"
            
            # Токенизируем входной текст
            inputs = tokenizer(full_prompt, return_tensors="pt", max_length=512, truncation=True)
            inputs = {k: v.to(device) for k, v in inputs.items()}
            
            # Генерируем ответ с более строгими параметрами
            with torch.no_grad():
                outputs = model.generate(
                    **inputs,
                    max_new_tokens=100,
                    num_return_sequences=1,
                    temperature=0.7 if attempt > 0 else 0.5,  # Повышаем температуру при повторных попытках
                    top_p=0.9,
                    top_k=50,
                    repetition_penalty=1.2,
                    no_repeat_ngram_size=3,
                    do_sample=True,
                    pad_token_id=tokenizer.eos_token_id,
                    eos_token_id=tokenizer.eos_token_id,
                )
            
            # Декодируем ответ
            response = tokenizer.decode(outputs[0], skip_special_tokens=True)
            
            # Извлекаем только ответ бота
            if "Бот:" in response:
                response = response.split("Бот:", 1)[1].strip()
            
            # Очищаем ответ
            response = response.split("\n")[0].strip()
            response = response.strip('"\'').strip()
            
            # Проверяем валидность ответа
            if is_response_valid(response, prompt):
                return response
                
            logger.warning(f"Попытка {attempt + 1}: Ответ не прошел валидацию: {response}")
            
        except Exception as e:
            logger.error(f"Ошибка при генерации ответа (попытка {attempt + 1}): {e}")
    
    # Если все попытки исчерпаны или произошла ошибка
    return generate_fallback_response(prompt)

# Команда /start
@dp.message(Command("start"))
async def cmd_start(message: types.Message):
    user_id = message.from_user.id
    user_contexts[user_id] = {
        'history': []
    }
    welcome_text = (
        "👋 Привет! Я бот с искусственным интеллектом, который может отвечать на вопросы на русском языке.\n\n"
        "Задавайте мне любые вопросы, и я постараюсь дать развернутый и полезный ответ!"
    )
    await message.answer(welcome_text)

# Обработчик текстовых сообщений
@dp.message()
async def handle_message(message: types.Message):
    # Пропускаем команды
    if message.text.startswith('/'):
        return
        
    user_id = message.from_user.id
    user_text = message.text.strip()
    
    # Инициализируем контекст пользователя, если его еще нет
    if user_id not in user_contexts:
        user_contexts[user_id] = {'history': []}
    
    # Показываем статус "печатает..."
    await bot.send_chat_action(chat_id=message.chat.id, action="typing")
    
    try:
        # Получаем ответ от модели
        response = await asyncio.to_thread(
            generate_response, 
            user_text,
            "\n".join(user_contexts[user_id]['history'][-5:])  # Последние 5 сообщений как контекст
        )
        
        # Сохраняем историю (ограничиваем размер)
        user_contexts[user_id]['history'].append(f"Пользователь: {user_text}")
        user_contexts[user_id]['history'].append(f"Бот: {response}")
        user_contexts[user_id]['history'] = user_contexts[user_id]['history'][-10:]  # Храним последние 5 пар Q&A
        
        # Отправляем ответ пользователю
        await message.answer(response, parse_mode=ParseMode.HTML)
        
    except Exception as e:
        logger.error(f"Ошибка при обработке сообщения: {e}")
        await message.answer("Произошла ошибка при обработке вашего запроса. Пожалуйста, попробуйте еще раз.")

async def shutdown(dp: Dispatcher):
    """Остановка бота"""
    if hasattr(dp.storage, 'close'):
        await dp.storage.close()
    if hasattr(dp.storage, 'wait_closed'):
        await dp.storage.wait_closed()
    if hasattr(dp.fsm.storage, 'close'):
        await dp.fsm.storage.close()
    if hasattr(dp.fsm.storage, 'wait_closed'):
        await dp.fsm.storage.wait_closed()

async def main():
    try:
        logger.info("Запуск бота...")
        
        # Проверяем соединение с API Telegram
        try:
            me = await bot.get_me()
            logger.info(f"Бот успешно авторизован как @{me.username} (ID: {me.id})")
        except Exception as e:
            logger.error(f"Ошибка при проверке токена бота: {e}")
            logger.error("Пожалуйста, проверьте правильность TELEGRAM_API_KEY в файле .env")
            return
            
        # Удаляем вебхук, если он был установлен
        try:
            await bot.delete_webhook(drop_pending_updates=True)
            logger.info("Вебхук успешно удален")
        except Exception as e:
            logger.warning(f"Не удалось удалить вебхук: {e}")
        
        # Обработчик сигналов для корректного завершения (только для Unix-подобных систем)
        if os.name != 'nt':  # 'nt' означает Windows
            try:
                loop = asyncio.get_running_loop()
                for sig in (signal.SIGINT, signal.SIGTERM):
                    loop.add_signal_handler(
                        sig,
                        lambda s=sig: asyncio.create_task(shutdown_handler(s, dp))
                    )
            except NotImplementedError:
                # Сигналы не поддерживаются в Windows
                pass
        
        # Запускаем опрос обновлений
        logger.info("Бот запущен и ожидает сообщений...")
        await dp.start_polling(bot, allowed_updates=dp.resolve_used_update_types())
        
    except asyncio.CancelledError:
        logger.info("Получен сигнал на завершение работы...")
    except Exception as e:
        logger.error(f"Критическая ошибка при работе бота: {e}", exc_info=True)
    finally:
        logger.info("Остановка бота...")
        try:
            await shutdown(dp)
            await bot.session.close()
            logger.info("Сессия бота успешно закрыта")
        except Exception as e:
            logger.error(f"Ошибка при закрытии сессии: {e}")

async def shutdown_handler(signal, dp: Dispatcher):
    """Обработчик сигналов завершения работы"""
    logger.info(f"Получен сигнал {signal.name}...")
    await dp.stop_polling()
    raise asyncio.CancelledError

if __name__ == "__main__":
    asyncio.run(main())
