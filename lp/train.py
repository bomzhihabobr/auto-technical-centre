from nlp_lib.intent_recognition import train_intent_model

print("🔄 Начало обучения модели...")
train_intent_model()
print("✅ Модель успешно обучена и сохранена в storage/intent_model.npz!")
