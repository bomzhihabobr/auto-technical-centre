import json
import os
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
import sys

# Добавление пути к папке nlp_lib для корректной работы импорта
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'nlp_lib')))

# Импортируем функции для взаимодействия с Gemini
from preprocessing import preprocess_text
from nlp_lib.gemini_client import classify_intent_with_gemini, generate_examples_for_intent

# Пути к файлам
INTENTS_FILE = "storage/intents.json"
MODEL_FILE = "storage/intent_model.npz"

# Загрузка намерений из файла
def load_intents():
    if os.path.exists(INTENTS_FILE):
        with open(INTENTS_FILE, "r", encoding="utf-8") as file:
            return json.load(file)
    return {}

# Обучение модели на основе существующих намерений
def train_intent_model():
    print("🔄 Начало обучения модели...")

    intents = load_intents()
    texts = []
    labels = []

    for intent, examples in intents.items():
        texts.extend(examples)
        labels.extend([intent] * len(examples))

    # Предобработка текстов
    processed_texts = [preprocess_text(text) for text in texts]

    # Векторизация текстов с использованием TF-IDF
    vectorizer = TfidfVectorizer()
    X = vectorizer.fit_transform(processed_texts)
    y = labels

    # Обучение модели классификации
    model = MultinomialNB()
    model.fit(X, y)

    # Сохраняем модель и векторизатор
    np.savez(MODEL_FILE, model=model, vectorizer=vectorizer)

    print("✅ Модель успешно обучена и сохранена в", MODEL_FILE)

# Предсказание намерения на основе входного текста
def predict_intent(text):
    # Загрузка обученной модели
    data = np.load(MODEL_FILE, allow_pickle=True)
    model = data["model"].item()
    vectorizer = data["vectorizer"].item()

    processed_text = preprocess_text(text)
    vectorized = vectorizer.transform([processed_text])

    intent = model.predict(vectorized)[0]

    if intent == "unknown":
        # Запросить у Gemini, если намерение не распознано
        intent = classify_intent_with_gemini(text)
        examples = generate_examples_for_intent(intent)

        # Добавить новое намерение и примеры в базу данных и переобучить модель
        add_new_intent(intent, [text] + examples)
        return intent

    return intent

# Добавление нового намерения и примеров в базу данных
def add_new_intent(intent, examples):
    intents = load_intents()
    
    if intent not in intents:
        intents[intent] = []
    
    intents[intent].extend(examples)

    # Сохраняем обновлённые намерения в файл
    with open(INTENTS_FILE, "w", encoding="utf-8") as file:
        json.dump(intents, file, ensure_ascii=False, indent=4)

    # Переобучаем модель
    train_intent_model()

# Пример намерений и фраз
if __name__ == "__main__":
    # Пример фраз для теста
    print("Предсказание намерения для фразы 'Какой ноутбук лучше купить?'")
    print(predict_intent("Какой ноутбук лучше купить?"))  # Ожидаемый результат: recommendation

    # Добавим новые примеры для обучения:
    new_intent = "check_availability"
    new_examples = [
        "Есть ли в наличии айфон?",
        "Есть ли в наличии ноутбук?",
        "Проверь наличие товара"
    ]
    
    # Добавляем новое намерение и примеры
    add_new_intent(new_intent, new_examples)

    # Пробуем предсказать намерение для нового текста
    print("Предсказание намерения для фразы 'Есть ли в наличии айфон?'")
    print(predict_intent("Есть ли в наличии айфон?"))  # Ожидаемый результат: check_availability
