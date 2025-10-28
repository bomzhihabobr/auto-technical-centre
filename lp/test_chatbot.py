import os
import re
import torch
import pymorphy2
from transformers import AutoModelForCausalLM, AutoTokenizer
from typing import List, Tuple, Optional

class RussianSpellChecker:
    def __init__(self):
        self.morph = pymorphy2.MorphAnalyzer()
        self.common_words = {
            'привет', 'здравствуйте', 'пока', 'спасибо', 'пожалуйста',
            'да', 'нет', 'хорошо', 'плохо', 'нормально'
        }
    
    def is_word_correct(self, word: str) -> bool:
        """Проверяет, является ли слово корректным русским словом"""
        if not word.isalpha():
            return True  # Пропускаем не-слова
            
        if word.lower() in self.common_words:
            return True
            
        parsed = self.morph.parse(word)
        # Слово считается корректным, если есть хотя бы один разбор с вероятностью > 0.3
        return any(p.score > 0.3 for p in parsed)
    
    def correct_text(self, text: str) -> Tuple[str, List[str]]:
        """Исправляет опечатки в тексте и возвращает исправленный текст и список исправлений"""
        words = re.findall(r'\b\w+\b|\S', text)
        corrections = []
        
        for i, word in enumerate(words):
            if not word.isalpha() or word.lower() in self.common_words:
                continue
                
            if not self.is_word_correct(word):
                # Пытаемся найти исправление
                parsed = self.morph.parse(word)
                if parsed and parsed[0].score > 0.1:  # Если есть разбор с приемлемой вероятностью
                    normal_form = parsed[0].normal_form
                    if normal_form != word.lower():
                        words[i] = normal_form
                        corrections.append((word, normal_form))
        
        return ' '.join(words), corrections

def load_model(model_path):
    """Загружает обученную модель и токенизатор"""
    if not os.path.exists(model_path):
        raise FileNotFoundError(
            f"Модель не найдена по пути {model_path}. "
            "Сначала обучите модель с помощью train_chatbot.py"
        )
    
    print(f"Загрузка модели из {model_path}...")
    tokenizer = AutoTokenizer.from_pretrained(model_path)
    model = AutoModelForCausalLM.from_pretrained(model_path)
    return model, tokenizer

def generate_response(model, tokenizer, prompt, max_length=100, temperature=0.7):
    """Генерирует ответ на сообщение пользователя"""
    # Формируем промпт
    input_text = f"Вопрос: {prompt}\nОтвет:"
    
    # Токенизируем входной текст
    inputs = tokenizer(input_text, return_tensors="pt")
    
    # Генерируем ответ
    with torch.no_grad():
        outputs = model.generate(
            inputs.input_ids,
            max_length=max_length,
            temperature=temperature,
            top_p=0.9,
            top_k=50,
            pad_token_id=tokenizer.eos_token_id,
            do_sample=True
        )
    
    # Декодируем и извлекаем ответ
    full_response = tokenizer.decode(outputs[0], skip_special_tokens=True)
    
    # Извлекаем только ответ (всё после "Ответ:")
    if "Ответ:" in full_response:
        response = full_response.split("Ответ:", 1)[1].strip()
    else:
        response = full_response
    
    return response

def main():
    try:
        # Инициализируем проверку орфографии
        spell_checker = RussianSpellChecker()
        
        # Загружаем модель
        model_path = "trained_model"
        model, tokenizer = load_model(model_path)
        
        # Проверяем доступность GPU
        device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        model = model.to(device)
        model.eval()
        
        print("\nМодель успешно загружена!")
        print("Введите ваше сообщение (или 'выход' для завершения):")
        print("-" * 50)
        print("Примечание: Я попробую исправить опечатки в ваших сообщениях!")
        print("-" * 50)
        
        # Интерактивный чат
        while True:
            try:
                user_input = input("\nВы: ")
                if user_input.lower() in ['выход', 'exit', 'quit']:
                    print("\nДо свидания!")
                    break
                
                # Проверяем и исправляем опечатки
                corrected_input, corrections = spell_checker.correct_text(user_input)
                
                if corrections:
                    print("\nИсправленные слова:")
                    for original, corrected in corrections:
                        print(f"  {original} → {corrected}")
                
                if corrected_input != user_input:
                    print(f"Исправленный запрос: {corrected_input}")
                
                # Генерируем ответ
                print("\nБот думает...")
                response = generate_response(model, tokenizer, corrected_input)
                print(f"Бот: {response}")
                
            except KeyboardInterrupt:
                print("\nЗавершение работы...")
                break
            except Exception as e:
                print(f"\nПроизошла ошибка: {str(e)}")
                print("Попробуйте переформулировать запрос.")
                
    except FileNotFoundError as e:
        print(f"\nОшибка: {str(e)}")
        print("\nИнструкция по обучению модели:")
        print("1. Убедитесь, что у вас установлены все зависимости:")
        print("   pip install torch transformers tqdm")
        print("2. Добавьте свои данные в файл data/chat_data.json")
        print("3. Запустите обучение:")
        print("   python train_chatbot.py")
        print("4. После успешного обучения запустите тестирование:")
        print("   python test_chatbot.py")

if __name__ == "__main__":
    main()
