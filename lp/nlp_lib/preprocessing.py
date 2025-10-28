import re
import spacy
import nltk
from nltk.corpus import stopwords

# Загрузка модели spaCy (английская, можно заменить на другую)
nlp = spacy.load("en_core_web_sm")

# Загружаем стоп-слова NLTK (нужно скачать их перед первым использованием)
nltk.download("stopwords")
stop_words = set(stopwords.words("english"))

def preprocess_text(text):
    """
    Предобработка текста: очистка, токенизация, удаление стоп-слов и лемматизация.
    """
    # Удаляем спецсимволы и цифры
    text = re.sub(r"[^a-zA-Zа-яА-Я\s]", "", text)

    # Токенизация и лемматизация через spaCy
    doc = nlp(text.lower())  # Приводим к нижнему регистру
    tokens = [token.lemma_ for token in doc if token.text not in stop_words]

    # Возвращаем обработанный текст
    return " ".join(tokens)

# Пример использования
if __name__ == "__main__":
    example_text = "Привет! Я хочу купить новый ноутбук Asus ROG Strix G16."
    print(preprocess_text(example_text))
