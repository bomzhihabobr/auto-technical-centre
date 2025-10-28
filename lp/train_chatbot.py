import os
import sys
import json
import torch
from torch.utils.data import Dataset, DataLoader
from transformers import (
    AutoTokenizer,
    AutoModelForCausalLM,
    get_linear_schedule_with_warmup
)
from torch.optim import AdamW
from tqdm import tqdm
import logging
from typing import Optional, List, Dict, Any

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class ChatDataset(Dataset):
    def __init__(self, data_path, tokenizer, max_length=128):
        self.tokenizer = tokenizer
        self.max_length = max_length
        self.examples = self._load_data(data_path)
    
    def _load_data(self, data_path):
        """Загрузка и предобработка данных"""
        examples = []
        
        # Пример формата данных: список пар [вопрос, ответ]
        # В реальном сценарии загружайте свои данные
        sample_data = [
            ["Привет, как дела?", "Привет! У меня все отлично, спасибо! А у тебя как?"],
            ["Что ты умеешь?", "Я умею поддерживать беседу и отвечать на вопросы. Чем могу помочь?"],
            ["Расскажи анекдот", "Извини, я пока не умею рассказывать анекдоты. Давай поговорим о чем-то другом?"],
        ]
        
        for pair in sample_data:
            # Формируем промпт в формате "Вопрос: ...\nОтвет: ..."
            text = f"Вопрос: {pair[0]}\nОтвет: {pair[1]}"
            examples.append(text)
            
        return examples
    
    def __len__(self):
        return len(self.examples)
    
    def __getitem__(self, idx):
        text = self.examples[idx]
        encoding = self.tokenizer(
            text,
            max_length=self.max_length,
            padding='max_length',
            truncation=True,
            return_tensors='pt'
        )
        
        return {
            'input_ids': encoding['input_ids'].squeeze(),
            'attention_mask': encoding['attention_mask'].squeeze(),
            'labels': encoding['input_ids'].squeeze().clone()
        }

def train(model, train_loader, optimizer, scheduler, device, epochs=3):
    """Функция для обучения модели"""
    model.train()
    
    for epoch in range(epochs):
        total_loss = 0
        progress_bar = tqdm(train_loader, desc=f'Epoch {epoch + 1}/{epochs}')
        
        for batch in progress_bar:
            input_ids = batch['input_ids'].to(device)
            attention_mask = batch['attention_mask'].to(device)
            labels = batch['labels'].to(device)
            
            # Обнуляем градиенты
            optimizer.zero_grad()
            
            # Прямой проход
            outputs = model(
                input_ids=input_ids,
                attention_mask=attention_mask,
                labels=labels
            )
            
            # Обратный проход и обновление весов
            loss = outputs.loss
            loss.backward()
            optimizer.step()
            scheduler.step()
            
            total_loss += loss.item()
            progress_bar.set_postfix({'loss': loss.item()})
        
        avg_loss = total_loss / len(train_loader)
        logger.info(f'Epoch {epoch + 1} - Average Loss: {avg_loss:.4f}')
    
    return model

def check_data_file(data_path):
    """Проверяет наличие и формат файла с данными"""
    if not os.path.exists(data_path):
        raise FileNotFoundError(f"Файл с данными не найден: {data_path}")
    
    try:
        with open(data_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            if not isinstance(data, list) or len(data) == 0:
                raise ValueError("Файл данных должен содержать непустой список примеров")
            if not all(isinstance(item, list) and len(item) == 2 for item in data):
                raise ValueError("Каждый пример должен быть списком из двух элементов [вопрос, ответ]")
        return True
    except json.JSONDecodeError:
        raise ValueError(f"Ошибка при чтении файла {data_path}: неверный формат JSON")

def main():
    try:
        # Параметры обучения
        MODEL_NAME = 'sberbank-ai/rugpt3small_based_on_gpt2'
        BATCH_SIZE = 2  # Уменьшаем размер батча для экономии памяти
        EPOCHS = 3
        LEARNING_RATE = 5e-5
        MAX_LENGTH = 256
        DATA_PATH = 'data/chat_data.json'
        OUTPUT_DIR = 'trained_model'
        
        print("=" * 50)
        print("ЗАПУСК ОБУЧЕНИЯ ЧАТ-БОТА")
        print("=" * 50)
        
        # Проверяем наличие файла с данными
        print(f"\n🔍 Проверка файла с данными: {DATA_PATH}")
        check_data_file(DATA_PATH)
        print("✅ Файл с данными корректен")
        
        # Проверяем доступность GPU
        device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        print(f"\n⚙️  Используемое устройство: {device}")
        if device.type == 'cuda':
            print(f"   Видеокарта: {torch.cuda.get_device_name(0)}")
        
        # Загружаем токенизатор и модель
        print("\n🔄 Загрузка модели и токенизатора...")
        tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
        tokenizer.pad_token = tokenizer.eos_token
        
        model = AutoModelForCausalLM.from_pretrained(MODEL_NAME)
        model.to(device)
        print(f"✅ Модель загружена: {MODEL_NAME}")
        
        # Создаем датасет и загрузчик
        print("\n📊 Подготовка данных для обучения...")
        dataset = ChatDataset(DATA_PATH, tokenizer, max_length=MAX_LENGTH)
        dataloader = DataLoader(dataset, batch_size=BATCH_SIZE, shuffle=True)
        print(f"✅ Загружено {len(dataset)} примеров, размер батча: {BATCH_SIZE}")
        
        # Настраиваем оптимизатор и шедулер
        optimizer = AdamW(model.parameters(), lr=LEARNING_RATE)
        total_steps = len(dataloader) * EPOCHS
        scheduler = get_linear_schedule_with_warmup(
            optimizer,
            num_warmup_steps=0,
            num_training_steps=total_steps
        )
        
        # Обучаем модель
        print("\n🚀 Начало обучения...")
        print(f"   Эпох: {EPOCHS}, Шагов: {len(dataloader)} на эпоху")
        print("   Это может занять некоторое время...\n")
        
        model = train(model, dataloader, optimizer, scheduler, device, epochs=EPOCHS)
        
        # Сохраняем модель
        print(f"\n💾 Сохранение модели в {OUTPUT_DIR}...")
        os.makedirs(OUTPUT_DIR, exist_ok=True)
        model.save_pretrained(OUTPUT_DIR)
        tokenizer.save_pretrained(OUTPUT_DIR)
        
        print("\n" + "=" * 50)
        print("✅ ОБУЧЕНИЕ УСПЕШНО ЗАВЕРШЕНО!")
        print("=" * 50)
        print(f"\nМодель сохранена в папку: {os.path.abspath(OUTPUT_DIR)}")
        print("\nДля тестирования модели выполните команду:")
        print("   python test_chatbot.py")
        
    except Exception as e:
        print("\n❌ ПРОИЗОШЛА ОШИБКА:")
        print(f"{str(e)}\n")
        print("Советы по устранению неполадок:")
        print("1. Проверьте наличие файла с данными в папке data/")
        print("2. Убедитесь, что формат данных корректен (список пар [вопрос, ответ] в формате JSON)")
        print("3. Проверьте подключение к интернету для загрузки модели")
        print("4. Убедитесь, что у вас достаточно свободной оперативной памяти")
        if torch.cuda.is_available():
            print("5. Попробуйте уменьшить размер батча (BATCH_SIZE) в коде")
        sys.exit(1)

if __name__ == '__main__':
    main()
