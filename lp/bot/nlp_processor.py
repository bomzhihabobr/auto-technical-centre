from typing import Dict, List, Optional, Tuple, Any
import re
from datetime import datetime, timedelta
import pytz

class NLProcessor:
    """Класс для обработки естественного языка"""
    
    def __init__(self, cinema_manager):
        self.cinema = cinema_manager
        self.movie_keywords = {
            'матрица': 'Матрица',
            'начало': 'Начало',
            'интерстеллар': 'Интерстеллар'
        }
        # Активности КиноРУМа
        self.activity_keywords = {
            'караоке': 'karaoke',
            'петь': 'karaoke',
            'музык': 'music',  # музыка, музыкальная
            'студия': 'music',
            'игр': 'gaming',   # игра, игровые, игровая
            'playstation': 'gaming',
            'xbox': 'gaming',
            'фильм': 'movie',
            'кино': 'movie',
            'зал': 'room',
            'комнат': 'room'
        }
        # Ключевые слова залов/комнат из конфига
        self.hall_keywords = {}
        try:
            for hall_id, hall in self.cinema.halls.items():
                # по id
                self.hall_keywords[hall_id.lower()] = hall_id
                # по названию
                name_key = hall.name.lower()
                self.hall_keywords[name_key] = hall_id
        except Exception:
            pass
        self.time_patterns = [
            (r'(\d{1,2})[.:]?(\d{2})?', self._parse_time),  # 19:30, 19.30, 19
            (r'в (\d{1,2})(?:[.:](\d{2}))?', self._parse_time),  # в 19:30, в 19
            (r'в (\d{1,2})(?:[.:](\d{2}))? часа?', self._parse_time),  # в 19:30 часа
            (r'(\d{1,2})(?:[.:](\d{2}))? часа?', self._parse_time),  # 19:30 часа
            # Естественные формулировки
            (r'в час ночи', lambda m: (1, 0)),
            (r'час ночи', lambda m: (1, 0)),
            (r'в полночь', lambda m: (0, 0)),
            (r'полночь', lambda m: (0, 0)),
            (r'в час дня', lambda m: (13, 0)),
            (r'час дня', lambda m: (13, 0)),
            (r'вечером', lambda m: (19, 0)),  # вечером = 19:00
            (r'дн[её]м', lambda m: (14, 0)),  # днем = 14:00
            (r'утром', lambda m: (10, 0)),  # утром = 10:00
        ]
        self.date_patterns = [
            (r'сегодня', self._get_today),  # сегодня
            (r'завтра', self._get_tomorrow),  # завтра
            (r'послезавтра', self._get_day_after_tomorrow),  # послезавтра
            (r'(\d{1,2})[./](\d{1,2})(?:[./](\d{2,4}))?', self._parse_date),  # 01.01, 01/01, 01.01.23
        ]
        # Будние дни и сокращения
        self.weekday_map = {
            'понедельник': 0, 'пн': 0,
            'вторник': 1, 'вт': 1,
            'среда': 2, 'ср': 2,
            'четверг': 3, 'чт': 3,
            'пятница': 4, 'пт': 4, 'пятницу': 4,
            'суббота': 5, 'субботу': 5, 'сб': 5, 'суб': 5,
            'воскресенье': 6, 'вс': 6
        }
    
    def extract_booking_info(self, text: str) -> Dict[str, Any]:
        """Извлечение информации о бронировании из текста"""
        text = text.lower()
        result = {
            'movie': None,
            'activity_type': None,
            'date': None,
            'time': None,
            'hall': None,
            'seats': None,
            'duration_minutes': None,
            'forbidden_night': False
        }
        
        # Тип активности КиноРУМа
        for key, act in self.activity_keywords.items():
            if key in text:
                result['activity_type'] = act
                break

        # Извлекаем название фильма
        for keyword, movie_title in self.movie_keywords.items():
            if keyword in text:
                result['movie'] = movie_title
                break
        
        # Извлекаем дату
        for pattern, handler in self.date_patterns:
            match = re.search(pattern, text)
            if match:
                result['date'] = handler(match)
                break
        # Будний день: "в субботу", "на субботу", "в пт"
        if not result['date']:
            wd_match = re.search(r'(?:в|на)\s+([а-яё.]+)', text)
            if wd_match:
                wd = wd_match.group(1).strip('. ')
                if wd in self.weekday_map:
                    result['date'] = self._next_weekday(self.weekday_map[wd])
        
        # Временной диапазон: "с 22 до часу ночи", "с 20:00 до 22:00"
        range_match = re.search(r'с\s*(\d{1,2})(?:[.:](\d{2}))?\s*(утра|дня|вечера|ночи)?\s*до\s*(\d{1,2})(?:[.:](\d{2}))?\s*(утра|дня|вечера|ночи)?', text)
        if range_match:
            h1 = int(range_match.group(1)); m1 = int(range_match.group(2) or 0); p1 = range_match.group(3)
            h2 = int(range_match.group(4)); m2 = int(range_match.group(5) or 0); p2 = range_match.group(6)
            h1 = self._apply_period(h1, p1)
            h2 = self._apply_period(h2, p2)
            base_date = result['date'] or self._get_today(None)
            start_dt = base_date.replace(hour=h1, minute=m1)
            end_dt = base_date.replace(hour=h2, minute=m2)
            if end_dt <= start_dt:
                end_dt += timedelta(days=1)
            result['time'] = start_dt
            result['duration_minutes'] = int((end_dt - start_dt).total_seconds() // 60)
        else:
            # Извлекаем одиночное время
            for pattern, handler in self.time_patterns:
                match = re.search(pattern, text)
                if match:
                    hours, minutes = handler(match)
                    if result['date']:
                        result['time'] = result['date'].replace(hour=hours, minute=minutes or 0)
                    break
        
        # Извлекаем зал/комнату (точное попадание по ключам)
        for keyword, hall_id in self.hall_keywords.items():
            if keyword in text:
                result['hall'] = hall_id
                break
        # Если зал не найден — пробуем нечёткий поиск (≤2 символов)
        if not result['hall'] and self.cinema and getattr(self.cinema, 'halls', None):
            tokens = re.findall(r'[\wёа-я]+', text)
            best = (10**9, None)
            for hid, hall in self.cinema.halls.items():
                candidates = [hid.lower(), hall.name.lower(), hall.name.lower().replace('-', ' ')]
                for cand in candidates:
                    # сравнение со всем текстом и с токенами
                    d_full = self._lev(cand, text)
                    if d_full < best[0]:
                        best = (d_full, hid)
                    for tok in tokens:
                        d_tok = self._lev(cand, tok)
                        if d_tok < best[0]:
                            best = (d_tok, hid)
            if best[0] <= 2:
                result['hall'] = best[1]

        # Извлекаем фильм (нечётко из фрагментов)
        if not result['movie'] and self.cinema and getattr(self.cinema, 'movies', None):
            tokens = re.findall(r'[\wёа-я]+', text)
            # Быстрая проверка по точному вхождению любого слова из названия
            for mid, movie in self.cinema.movies.items():
                title = movie.title.lower()
                title_tokens = [t for t in re.findall(r'[\wёа-я]+', title) if len(t) > 2]
                if any(t in text for t in title_tokens):
                    result['movie'] = mid
                    break
            # Если всё ещё не нашли — Левенштейн по названию и словам
            if not result['movie']:
                best = (10**9, None)
                for mid, movie in self.cinema.movies.items():
                    title = movie.title.lower()
                    d_full = self._lev(title, text)
                    if d_full < best[0]:
                        best = (d_full, mid)
                    # сравниваем по словам названия с токенами ввода
                    for word in re.findall(r'[\wёа-я]+', title):
                        for tok in tokens:
                            d_tok = self._lev(word, tok)
                            if d_tok < best[0]:
                                best = (d_tok, mid)
                if best[0] <= 2:
                    result['movie'] = best[1]

        # Извлекаем количество мест/людей: 10 мест, 10 билетов, 10 человек, 10 персон, на 10 человек
        seat_match = re.search(r'(\d+)\s*(?:мест[ао]?|билет[аов]?|человек|персон[ы]?)', text)
        if seat_match:
            result['seats'] = int(seat_match.group(1))
        else:
            seat_match2 = re.search(r'на\s*(\d+)\s*(?:человек|персон[ы]?)', text)
            if seat_match2:
                result['seats'] = int(seat_match2.group(1))
        
        # Запрещённая расплывчатость: "на ночь"
        if 'на ночь' in text:
            result['forbidden_night'] = True

        # Извлекаем длительность (на 2 часа, на 1.5 часа, 90 минут, 2ч, пару часов)
        dur_match = re.search(r'на\s*(\d+(?:[.,]\d+)?)\s*(?:час|ч)\b', text)
        if dur_match:
            hours = float(dur_match.group(1).replace(',', '.'))
            result['duration_minutes'] = int(hours * 60)
        else:
            min_match = re.search(r'(\d+)\s*минут', text)
            if min_match:
                result['duration_minutes'] = int(min_match.group(1))
            else:
                pair_match = re.search(r'пару\s*час', text)
                if pair_match:
                    result['duration_minutes'] = 120
        
        return result

    # Простой Левенштейн без внешних зависимостей
    def _lev(self, a: str, b: str) -> int:
        a = a.lower(); b = b.lower()
        if a == b:
            return 0
        if not a:
            return len(b)
        if not b:
            return len(a)
        dp = list(range(len(b) + 1))
        for i, ca in enumerate(a, 1):
            prev = dp[0]
            dp[0] = i
            for j, cb in enumerate(b, 1):
                cur = dp[j]
                cost = 0 if ca == cb else 1
                dp[j] = min(
                    dp[j] + 1,      # deletion
                    dp[j-1] + 1,    # insertion
                    prev + cost      # substitution
                )
                prev = cur
        return dp[-1]

    def _apply_period(self, hour: int, period: Optional[str]) -> int:
        if not period:
            return hour
        period = period.lower()
        if period in ('вечера', 'дня') and hour < 12:
            return hour + 12
        if period in ('утра', 'ночи'):
            # ночь: оставляем как есть (1 ночь = 01:00)
            return hour if hour < 24 else hour % 24
        return hour

    def _next_weekday(self, target_wd: int) -> datetime:
        now = datetime.now(pytz.timezone('UTC'))
        today_wd = now.weekday()
        days_ahead = (target_wd - today_wd) % 7
        if days_ahead == 0:
            days_ahead = 7
        return now + timedelta(days=days_ahead)
    
    def _parse_time(self, match) -> Tuple[int, int]:
        """Парсинг времени из текста"""
        hours = int(match.group(1))
        minutes = int(match.group(2) or '0')
        return hours, minutes
    
    def _get_today(self, match) -> datetime:
        """Получить объект datetime на сегодня"""
        return datetime.now(pytz.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    
    def _get_tomorrow(self, match) -> datetime:
        """Получить объект datetime на завтра"""
        return (datetime.now(pytz.utc) + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
    
    def _get_day_after_tomorrow(self, match) -> datetime:
        """Получить объект datetime на послезавтра"""
        return (datetime.now(pytz.utc) + timedelta(days=2)).replace(hour=0, minute=0, second=0, microsecond=0)
    
    def _parse_date(self, match) -> datetime:
        """Парсинг даты из текста"""
        day = int(match.group(1))
        month = int(match.group(2))
        year = int(match.group(3) or datetime.now().year)
        
        if year < 100:  # Двухзначный год
            year += 2000 if year < 50 else 1900
        
        try:
            return datetime(year, month, day, tzinfo=pytz.utc)
        except ValueError:
            return None

    def find_closest_screening(self, movie_title: str, target_time: datetime = None, hall_name: str = None) -> dict:
        """Найти ближайший подходящий сеанс"""
        if not target_time:
            target_time = datetime.now(pytz.utc)
        
        closest = None
        min_diff = float('inf')
        
        for screening_id, screening in self.cinema.screenings.items():
            if screening.movie_title != movie_title:
                continue
                
            if hall_name and screening.hall_name != hall_name:
                continue
                
            time_diff = abs((screening.start_time - target_time).total_seconds())
            
            # Предпочитаем сеансы в будущем, но учитываем и прошедшие (на случай небольших расхождений)
            if screening.start_time >= target_time - timedelta(hours=1):
                time_diff *= 0.9  # Небольшой бонус к будущим сеансам
            
            if time_diff < min_diff:
                min_diff = time_diff
                closest = screening
        
        return {
            'screening': closest,
            'time_diff': min_diff
        } if closest else None
