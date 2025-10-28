import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

model = genai.GenerativeModel("gemini-pro")

def classify_intent_with_gemini(text):
    prompt = f"""Ты NLP-ассистент. Пользователь сказал: "{text}". Какое это намерение?
Выбери из: recommendation, check_availability, greeting, goodbye, other.
Ответь только названием намерения."""

    response = model.generate_content(prompt)
    return response.text.strip().lower()

def generate_examples_for_intent(intent_name):
    prompt = f"""Придумай 5 коротких пользовательских фраз, которые соответствуют намерению "{intent_name}"."""
    response = model.generate_content(prompt)
    return [line.strip("- ").strip() for line in response.text.strip().split("\n") if line]
