import spacy

# Загружаем модель Spacy (если нет, установи командой: python -m spacy download ru_core_news_sm)
nlp = spacy.load("en_core_web_sm")

def extract_entities(text):
    """Извлекает именованные сущности из текста."""
    doc = nlp(text)
    return [(ent.text, ent.label_) for ent in doc.ents]
