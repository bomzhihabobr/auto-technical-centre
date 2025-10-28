from typing import Dict, List, Tuple

# Настройки залов
HALLS = {
    # Кино-комнаты (сеансы фильмов)
    "kubrick": {
        "name": "Кубрик",
        "capacity": 80,
        "description": "Современный кинозал с панорамным экраном и безупречным звуком",
        "base_price": 400,
        "room_type": "movie",
        "activities": ["фильм"],
        "slot_duration_minutes": 120
    },
    "tarantino": {
        "name": "Тарантино",
        "capacity": 120,
        "description": "Стильный кинозал в ретро-стиле с кожаными креслами",
        "base_price": 350,
        "room_type": "movie",
        "activities": ["фильм"],
        "slot_duration_minutes": 120
    },
    "nolan": {
        "name": "Нолан",
        "capacity": 100,
        "description": "Кинозал с IMAX экраном и мощной акустической системой",
        "base_price": 500,
        "room_type": "movie",
        "activities": ["фильм"],
        "slot_duration_minutes": 150
    },
    # Комнаты КиноРУМа, названные в честь режиссёров (слоты бронирования)
    "kurosawa": {
        "name": "Куросава",
        "capacity": 3,
        "description": "Комната на небольшие компании",
        "base_price": 1500,
        "room_type": "room",
        "activities": ["комната"],
        "slot_duration_minutes": 60
    },
    "hitchcock": {
        "name": "Хичкок",
        "capacity": 6,
        "description": "Комната для уютных встреч",
        "base_price": 1800,
        "room_type": "room",
        "activities": ["комната"],
        "slot_duration_minutes": 60
    },
    "spielberg": {
        "name": "Спилберг",
        "capacity": 9,
        "description": "Комната для команды друзей",
        "base_price": 2100,
        "room_type": "room",
        "activities": ["комната"],
        "slot_duration_minutes": 60
    },
    "fellini": {
        "name": "Феллини",
        "capacity": 12,
        "description": "Просторная комната для мероприятий",
        "base_price": 2400,
        "room_type": "room",
        "activities": ["комната"],
        "slot_duration_minutes": 60
    },
    "bergman": {
        "name": "Бергман",
        "capacity": 15,
        "description": "Большая комната на компанию",
        "base_price": 2700,
        "room_type": "room",
        "activities": ["комната"],
        "slot_duration_minutes": 60
    }
}

# Настройки фильмов
MOVIES = {
    "matrix": {
        "title": "Матрица",
        "duration": 136,
        "description": "Хакер Нео узнает, что его мир — виртуальная реальность, созданная машинами.",
        "age_restriction": "16+",
        "genres": ["фантастика", "боевик", "триллер"],
        "director": "Лана и Лилли Вачовски",
        "actors": ["Киану Ривз", "Лоренс Фишберн", "Кэрри-Энн Мосс"]
    },
    "inception": {
        "title": "Начало",
        "duration": 148,
        "description": "Профессиональные воры внедряются в сны, чтобы выкрасть секреты.",
        "age_restriction": "12+",
        "genres": ["фантастика", "боевик", "триллер"],
        "director": "Кристофер Нолан",
        "actors": ["Леонардо ДиКаприо", "Джозеф Гордон-Левитт", "Эллен Пейдж"]
    }
}

# Время начала сеансов
SCREENING_TIMES = ["10:00", "13:00", "16:00", "19:00", "22:00"]

# Дни для отображения расписания
SCHEDULE_DAYS = 7
