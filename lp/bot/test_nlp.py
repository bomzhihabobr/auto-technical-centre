"""
Скрипт для тестирования NLP-функционала бота.
Позволяет проверить, как бот обрабатывает различные фразы пользователя.
"""
import sys
import os
from pathlib import Path

# Добавляем корневую директорию в путь Python
sys.path.append(str(Path(__file__).parent.parent))

from bot.nlp_processor import NLProcessor
from bot.cinema_bot import cinema

def test_nlp_processing():
    """Тестирование обработки естественного языка"""
    print("Тестирование обработки естественного языка\n")
    
    # Инициализируем процессор NLP
    nlp = NLProcessor(cinema)
    
    # Тестовые фразы
    test_phrases = [
        "Хочу забронировать билеты на Матрицу",
        "Какие фильмы идут завтра?",
        "Забронируйте 2 места на 19:00",
        "Покажите сеансы на послезавтра",
        "Есть ли места на Начало в 18:30?",
        "Отмена"
    ]
    
    # Тестируем каждую фразу
    for phrase in test_phrases:
        print(f"Фраза: {phrase}")
        booking_info = nlp.extract_booking_info(phrase)
        print("Результат обработки:")
        for key, value in booking_info.items():
            if value:  # Показываем только непустые значения
                print(f"  {key}: {value}")
        print("-" * 50)

if __name__ == "__main__":
    test_nlp_processing()
