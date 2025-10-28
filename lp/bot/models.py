from datetime import datetime
from pydantic import BaseModel, Field
from typing import Dict, List, Optional
import pytz

class Hall(BaseModel):
    name: str
    capacity: int
    description: str = ""
    # Kinorum fields
    room_type: str = "movie"  # movie, karaoke, music, gaming, party
    activities: List[str] = Field(default_factory=list)  # e.g. ["фильм"], ["караоке"], ["музыка"]
    slot_duration_minutes: int = 60  # default slot length for non-movie rooms

class Movie(BaseModel):
    title: str
    duration: int  # in minutes
    description: str = ""
    age_restriction: str = "0+"
    genres: List[str] = Field(default_factory=list)
    director: str = ""
    actors: List[str] = Field(default_factory=list)

class Screening(BaseModel):
    movie_title: str
    hall_name: str
    start_time: datetime
    end_time: datetime
    price: float
    available_seats: int

class Booking(BaseModel):
    user_id: int
    screening_id: str
    seats: int
    booking_time: datetime = Field(default_factory=datetime.utcnow)
    status: str = "pending"  # pending, confirmed, cancelled, completed
    payment_status: str = "pending"  # pending, paid, refunded

class UserData(BaseModel):
    user_id: int
    name: str = ""
    phone: str = ""
    email: str = ""
    bookings: List[str] = Field(default_factory=list)  # List of booking IDs
