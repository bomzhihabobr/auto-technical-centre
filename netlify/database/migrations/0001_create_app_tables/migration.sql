CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin'
);

CREATE TABLE IF NOT EXISTS bookings (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  car TEXT NOT NULL DEFAULT '',
  vehicle_type TEXT NOT NULL DEFAULT '',
  service_type TEXT NOT NULL DEFAULT '',
  date DATE NOT NULL,
  time TEXT NOT NULL,
  comment TEXT NOT NULL DEFAULT '',
  consent_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'Новая',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS bookings_unique_active_slot
  ON bookings (date, time) WHERE status <> 'Отменена';

CREATE TABLE IF NOT EXISTS booking_activity (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  old_status TEXT,
  new_status TEXT,
  actor TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS content (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'text'
);

CREATE TABLE IF NOT EXISTS admin_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
