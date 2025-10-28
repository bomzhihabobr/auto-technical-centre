import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from nlp_lib.intent_recognition import predict_intent


examples = [
    "У тебя есть ноутбуки?",
    "Что ты можешь посоветовать?",
    "Какой ноутбук лучше купить?",
    "Покажи что в наличии",
]

for text in examples:
    intent = predict_intent(text)
    print(f"[{text}] → {intent}")
