const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();
const http = require('http');
const path = require('path');
const os = require('os');
const fs = require('fs');
const crypto = require('crypto');

// Local-only secrets live outside the deployable site bundle.
try { process.loadEnvFile(path.join(__dirname, 'secret', '.env')); } catch (error) { if (error.code !== 'ENOENT') throw error; }

const app = express();
const server = http.createServer(app);
app.disable('x-powered-by');

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');

// Database setup
const db = new sqlite3.Database(path.join(__dirname, 'database.db'));
db.run(`CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  car TEXT DEFAULT '',
  vehicle_type TEXT DEFAULT '',
  service_type TEXT DEFAULT '',
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  comment TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Новая',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);
for (const [column, declaration] of [['vehicle_type', "TEXT DEFAULT ''"], ['service_type', "TEXT DEFAULT ''"], ['consent_at', 'TEXT']]) {
  db.run(`ALTER TABLE bookings ADD COLUMN ${column} ${declaration}`, err => {
    if (err && !/duplicate column name/i.test(err.message)) console.error(`Could not add ${column} to bookings:`, err.message);
  });
}
db.run(`CREATE TABLE IF NOT EXISTS booking_activity (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER NOT NULL,
  action TEXT NOT NULL,
  old_status TEXT,
  new_status TEXT,
  actor TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);
db.run(`CREATE TABLE IF NOT EXISTS admin_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
)`);
db.run(`CREATE TABLE IF NOT EXISTS content (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  type TEXT DEFAULT 'text'
)`);
db.run(`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT DEFAULT 'admin'
)`);
db.run(`CREATE TABLE IF NOT EXISTS booking_slots (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT NOT NULL, time TEXT NOT NULL, UNIQUE(date,time))`);
db.run(`CREATE TABLE IF NOT EXISTS booking_metrics (id INTEGER PRIMARY KEY AUTOINCREMENT, vehicle_type TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);

// Middleware
app.use(cors());
app.use(express.json({ limit: '32kb' }));

// Security headers on every response
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' https://unpkg.com https://cdnjs.cloudflare.com https://code.jquery.com https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com https://cdnjs.cloudflare.com; font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com; img-src 'self' data: https:; connect-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
  next();
});

// Global API rate limit: blunts scraping and abuse before route handlers
app.use('/api', (req, res, next) => {
  const key = `${req.method}:${req.ip || req.socket.remoteAddress || 'unknown'}`;
  const now = Date.now();
  if (globalApiBuckets.size > 20000) globalApiBuckets.clear();
  let bucket = globalApiBuckets.get(key);
  if (!bucket || now - bucket.start > 60 * 1000) {
    bucket = { start: now, count: 0 };
    globalApiBuckets.set(key, bucket);
  }
  bucket.count += 1;
  res.setHeader('X-RateLimit-Limit', '240');
  res.setHeader('X-RateLimit-Remaining', Math.max(0, 240 - bucket.count));
  if (bucket.count > 240) {
    res.setHeader('Retry-After', '60');
    return res.status(429).json({ error: 'Слишком много запросов. Попробуйте через минуту.' });
  }
  next();
});
const globalApiBuckets = new Map();

// Simple per-IP rate limiting for sensitive endpoints
const rateBuckets = new Map();
function rateLimit(scope, windowMs, max) {
  return (req, res, next) => {
    const key = `${scope}:${req.ip || req.socket.remoteAddress || 'unknown'}`;
    const now = Date.now();
    if (rateBuckets.size > 10000) rateBuckets.clear();
    let bucket = rateBuckets.get(key);
    if (!bucket || now - bucket.start > windowMs) {
      bucket = { start: now, count: 0 };
      rateBuckets.set(key, bucket);
    }
    bucket.count += 1;
    if (bucket.count > max) return res.status(429).json({ error: 'Слишком много запросов. Попробуйте через минуту.' });
    next();
  };
}

function requireAdmin(req, res, next) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  try {
    req.admin = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Требуется вход в панель администратора' });
  }
}

app.post('/api/login', rateLimit('login', 60 * 1000, 10), (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'Введите логин и пароль' });
  db.get('SELECT id, username, password, role FROM users WHERE username = ?', [String(username).slice(0, 80)], async (err, user) => {
    if (err) return res.status(500).json({ error: 'Не удалось выполнить вход' });
    if (!user) return res.status(401).json({ error: 'Неверный логин или пароль' });
    try {
      const valid = await bcrypt.compare(String(password), user.password);
      if (!valid) return res.status(401).json({ error: 'Неверный логин или пароль' });
      const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '12h' });
      res.json({ token });
    } catch { res.status(500).json({ error: 'Не удалось выполнить вход' }); }
  });
});

app.post('/api/bookings', rateLimit('bookings', 60 * 1000, 20), (req, res) => {
  const clean = (v, max) => typeof v === 'string' ? v.trim().slice(0, max) : '';
  const booking = {
    name: clean(req.body?.name, 120), phone: clean(req.body?.phone, 40),
    car: clean(req.body?.car, 120), vehicleType: clean(req.body?.vehicleType, 50), serviceType: 'inspection', date: clean(req.body?.date, 20),
    consent: req.body?.consent === true,
    time: clean(req.body?.time, 10), comment: clean(req.body?.comment, 1000)
  };
  if (!booking.name || !booking.phone || !booking.vehicleType || !booking.date || !booking.time) return res.status(400).json({ error: 'Заполните обязательные поля и выберите тип транспорта' });
  if (!['passenger','commercial','bus','motorcycle','trailer'].includes(booking.vehicleType)) return res.status(400).json({ error: 'Выберите тип транспорта из списка' });
  if (!booking.consent) return res.status(400).json({ error: 'Подтвердите согласие на обработку данных' });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(booking.date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(booking.time)) return res.status(400).json({ error: 'Проверьте дату и время записи' });
  const parsedDate = new Date(`${booking.date}T00:00:00Z`);
  if (Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== booking.date) return res.status(400).json({ error: 'Указана некорректная дата' });
  readSiteSettings((settingsError, settings) => {
    if (settingsError) return res.status(500).json({ error: 'Не удалось проверить расписание' });
    const times = scheduleSlots(settings, booking.date);
    if (!times.includes(booking.time)) return res.status(400).json({ error: 'Выберите время из доступных интервалов' });
    if (!isFutureAppointment(booking.date, booking.time)) return res.status(400).json({ error: 'Выбранное время уже прошло' });
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.CHAT_ID;
    if (!token || !chatId) return res.status(503).json({ error: 'Приём заявок временно не настроен. Позвоните нам.' });
    db.run(`INSERT INTO booking_slots (date,time) SELECT ?,? WHERE NOT EXISTS (SELECT 1 FROM bookings WHERE date=? AND time=? AND status!='Отменена')`, [booking.date, booking.time, booking.date, booking.time], async function (err) {
      if (err) {
        if (/UNIQUE/i.test(err.message || '')) return res.status(409).json({ error: 'Это время только что заняли. Выберите другой интервал.' });
        return res.status(500).json({ error: 'Не удалось принять заявку. Попробуйте ещё раз.' });
      }
      if (!this.changes) return res.status(409).json({ error: 'Это время только что заняли. Выберите другой интервал.' });
      const bookingId = this.lastID;
      const message = [`Новая заявка на техосмотр №${bookingId}`, `Имя: ${booking.name}`, `Телефон: ${booking.phone}`, `Автомобиль: ${booking.car || 'не указан'}`, `Категория: ${booking.vehicleType}`, `Дата и время: ${booking.date} ${booking.time}`, `Комментарий: ${booking.comment || 'нет'}`].join('\n');
      try {
        const telegram = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: chatId, text: message }) });
        const result = await telegram.json();
        if (!telegram.ok || !result.ok) throw new Error('Telegram rejected message');
        db.run('INSERT INTO booking_metrics (vehicle_type) VALUES (?)', [booking.vehicleType]);
        res.status(201).json({ ok: true, id: bookingId });
      } catch {
        db.run('DELETE FROM booking_slots WHERE id = ?', [bookingId]);
        res.status(502).json({ error: 'Не удалось отправить заявку. Попробуйте ещё раз или позвоните нам.' });
      }
    });
  });
});

app.use('/api/bookings', requireAdmin, (req, res) => res.status(404).json({ error: 'Персональные заявки доступны только в Telegram' }));

app.get('/api/bookings', requireAdmin, (req, res) => {
  const limit = Math.max(1, Math.min(500, Number.parseInt(req.query.limit, 10) || 100));
  db.all('SELECT id, name, phone, car, vehicle_type, service_type, date, time, comment, consent_at, status, created_at FROM bookings ORDER BY id DESC LIMIT ?', [limit], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Не удалось загрузить заявки' });
    res.json(rows);
  });
});

app.patch('/api/bookings/:id', requireAdmin, (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  const allowedStatuses = ['Новая', 'В работе', 'Завершена', 'Отменена'];
  const status = req.body?.status;
  if (!Number.isInteger(id) || !allowedStatuses.includes(status)) return res.status(400).json({ error: 'Некорректный статус заявки' });
  db.get('SELECT status, date, time FROM bookings WHERE id = ?', [id], (findError, booking) => {
    if (findError) return res.status(500).json({ error: 'Не удалось найти заявку' });
    if (!booking) return res.status(404).json({ error: 'Заявка не найдена' });
    const update = () => {
      db.run('UPDATE bookings SET status = ? WHERE id = ?', [status, id], function (err) {
        if (err) return res.status(500).json({ error: 'Не удалось обновить заявку' });
        const finish = () => res.json({ ok: true });
        if (booking.status === status) return finish();
        db.run('INSERT INTO booking_activity (booking_id, action, old_status, new_status, actor) VALUES (?, ?, ?, ?, ?)',
          [id, 'status_changed', booking.status, status, String(req.admin?.username || 'admin').slice(0, 80)], historyError => {
            if (historyError) console.error('Could not record booking status change:', historyError.message);
            finish();
          });
      });
    };
    if (status === 'Отменена') return update();
    db.get("SELECT id FROM bookings WHERE date = ? AND time = ? AND id != ? AND status != 'Отменена' LIMIT 1", [booking.date, booking.time, id], (conflictError, conflict) => {
      if (conflictError) return res.status(500).json({ error: 'Не удалось проверить доступность времени' });
      if (conflict) return res.status(409).json({ error: 'Нельзя активировать заявку: это время уже занято другой записью' });
      update();
        });
  });
});

app.get('/api/bookings/:id/history', requireAdmin, (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'Некорректный номер заявки' });
  db.all('SELECT action, old_status, new_status, actor, created_at FROM booking_activity WHERE booking_id = ? ORDER BY id DESC', [id], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Не удалось загрузить историю заявки' });
    res.json(rows);
  });
});

app.delete('/api/bookings/:id', requireAdmin, (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'Некорректный номер заявки' });
  db.run('DELETE FROM bookings WHERE id = ?', [id], function (err) {
    if (err) return res.status(500).json({ error: 'Не удалось удалить заявку' });
    if (!this.changes) return res.status(404).json({ error: 'Заявка не найдена' });
    res.json({ ok: true });
  });
});

app.post('/api/change-password', requireAdmin, async (req, res) => {
  const currentPassword = String(req.body?.currentPassword || '').slice(0, 300);
  const newPassword = String(req.body?.newPassword || '').slice(0, 300);
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Заполните оба поля пароля' });
  if (newPassword.length < 6) return res.status(400).json({ error: 'Новый пароль должен быть не менее 6 символов' });
  if (currentPassword === newPassword) return res.status(400).json({ error: 'Новый пароль не должен совпадать со старым' });
  db.get('SELECT id, username, password FROM users WHERE username = ?', [String(req.admin.username || 'admin').slice(0, 80)], async (err, user) => {
    if (err) return res.status(500).json({ error: 'Не удалось найти пользователя' });
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
    try {
      const valid = await bcrypt.compare(currentPassword, user.password);
      if (!valid) return res.status(401).json({ error: 'Текущий пароль неверен' });
      const hash = await bcrypt.hash(newPassword, 10);
      db.run('UPDATE users SET password = ? WHERE id = ?', [hash, user.id], updateErr => {
        if (updateErr) return res.status(500).json({ error: 'Не удалось обновить пароль' });
        res.json({ ok: true });
      });
    } catch { res.status(500).json({ error: 'Не удалось обновить пароль' }); }
  });
});

const DEFAULT_PRICE_LIST = [
  { nameRu: 'Автомобиль легковой', nameKk: 'Жеңіл автомобиль', price: '10 000' },
  { nameRu: 'Внедорожник, S-class, кроссовер', nameKk: 'Джип, S-класс, кроссовер', price: '12 000' },
  { nameRu: 'Микроавтобус (до 16 мест)', nameKk: 'Микроавтобус (16 орынға дейін)', price: '15 000' },
  { nameRu: 'Грузовое ТС (до 3,5 т)', nameKk: 'Жүк көлігі (3,5 т-ға дейін)', price: '15 000' },
  { nameRu: 'Грузовое ТС (категория C1)', nameKk: 'Жүк көлігі (C1 санаты)', price: '20 000' },
  { nameRu: 'Прицеп', nameKk: 'Тіркеме', price: '9 000' },
  { nameRu: 'Мототранспортное средство', nameKk: 'Мотокөлік құралы', price: '9 000' }
];
const SITE_DEFAULTS = {
  mainTitle: 'Техосмотр в Астане — Қобыз, 36 | Auto Technical Centre',
  siteDescription: 'Пройдите техосмотр автомобиля в Астане по адресу Қобыз, 36. Выберите свободное время онлайн, посмотрите карту проезда и свяжитесь с Auto Technical Centre.',
  mainPhone: '+7 776 848 27 44', whatsappPhone: '+7 776 848 27 44',
  address: 'г. Астана, Қобыз, 36',
  email: 'atc@at-c.kz',
  workingHours: 'Пн–Пт 09:00–20:00, Сб 10:00–20:00, Вс 10:00–18:00',
  workingHoursKk: 'Дс–Жм 09:00–20:00, сенбі 10:00–20:00, жексенбі 10:00–18:00',
  schedule: JSON.stringify({
    0: { open: '10:00', close: '18:00' },
    1: { open: '09:00', close: '20:00' },
    2: { open: '09:00', close: '20:00' },
    3: { open: '09:00', close: '20:00' },
    4: { open: '09:00', close: '20:00' },
    5: { open: '09:00', close: '20:00' },
    6: { open: '10:00', close: '20:00' }
  }),
  promoTextRu: '',
  promoTextKk: '',
  priceList: JSON.stringify(DEFAULT_PRICE_LIST)
};
function normalizePriceList(raw) {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  try {
    const items = JSON.parse(raw);
    if (!Array.isArray(items) || items.length === 0 || items.length > 50) return null;
    const cleanItems = items.map(item => ({
      nameRu: String(item?.nameRu || '').trim().slice(0, 160),
      nameKk: String(item?.nameKk || '').trim().slice(0, 160),
      price: String(item?.price || '').trim().slice(0, 30)
    })).filter(item => item.nameRu && item.price);
    return cleanItems.length ? JSON.stringify(cleanItems) : null;
  } catch { return null; }
}
function readSiteSettings(callback) {
  db.all('SELECT key, value FROM content', [], (err, rows) => {
    if (err) return callback(err);
    const settings = { ...SITE_DEFAULTS };
    rows.forEach(row => { if (Object.prototype.hasOwnProperty.call(settings, row.key)) settings[row.key] = row.value; });
    if (settings.mainTitle === 'Техосмотр в Астане — Auto Technical Centre') settings.mainTitle = SITE_DEFAULTS.mainTitle;
    if (settings.siteDescription === 'Специализированный центр техосмотра в Астане. Запишитесь онлайн или по телефону.') settings.siteDescription = SITE_DEFAULTS.siteDescription;
    callback(null, settings);
  });
}

function buildAppointmentTimes(workingHours) {
  const matches = String(workingHours || '').match(/(\d{1,2}):([0-5]\d).*?(\d{1,2}):([0-5]\d)/);
  const start = matches ? Number(matches[1]) * 60 + Number(matches[2]) : 9 * 60;
  const end = matches ? Number(matches[3]) * 60 + Number(matches[4]) : 19 * 60;
  return minutesToSlots(start, end);
}

function minutesToSlots(start, end) {
  const slots = [];
  for (let minute = start; minute < end; minute += 30) slots.push(`${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`);
  return slots;
}

function normalizeSchedule(raw) {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  let parsed;
  try { parsed = JSON.parse(raw); } catch { return null; }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
  const schedule = {};
  const timeOk = value => /^([01]\d|2[0-3]):[0-5]\d$/.test(value || '');
  for (let day = 0; day <= 6; day++) {
    const entry = parsed[String(day)];
    if (!entry || typeof entry !== 'object' || entry.closed === true) { schedule[String(day)] = { closed: true }; continue; }
    if (!timeOk(entry.open) || !timeOk(entry.close) || entry.open >= entry.close) return null;
    schedule[String(day)] = { open: entry.open, close: entry.close };
  }
  return JSON.stringify(schedule);
}

function scheduleSlots(settings, date) {
  try {
    const schedule = normalizeSchedule(settings.schedule);
    if (schedule) {
      const day = new Date(`${date}T12:00:00Z`).getUTCDay();
      const entry = JSON.parse(schedule)[String(day)];
      if (!entry || entry.closed) return [];
      const toMin = value => { const [h, m] = value.split(':').map(Number); return h * 60 + m; };
      return minutesToSlots(toMin(entry.open), toMin(entry.close));
    }
  } catch { /* fall back to workingHours text */ }
  return buildAppointmentTimes(settings.workingHours);
}

function isFutureAppointment(date, time) {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  if (date !== today) return date > today;
  const [hour, minute] = time.split(':').map(Number);
  return hour * 60 + minute > now.getHours() * 60 + now.getMinutes();
}

app.get('/api/availability', (req, res) => {
  const date = typeof req.query.date === 'string' ? req.query.date : '';
  const parsedDate = /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(`${date}T00:00:00Z`) : null;
  if (!parsedDate || Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== date) return res.status(400).json({ error: 'Укажите корректную дату' });
  db.all("SELECT time FROM bookings WHERE date = ? AND status != 'Отменена' UNION SELECT time FROM booking_slots WHERE date = ?", [date, date], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Не удалось проверить свободное время' });
    readSiteSettings((settingsError, settings) => {
      if (settingsError) return res.status(500).json({ error: 'Не удалось загрузить расписание' });
      const busy = new Set(rows.map(row => row.time));
      const allTimes = scheduleSlots(settings, date);
      const availableTimes = allTimes.filter(time => !busy.has(time) && isFutureAppointment(date, time));
      const bookedTimes = allTimes.filter(time => busy.has(time));
      res.json({ date, availableTimes, bookedTimes, intervalMinutes: 30 });
    });
  });
});

app.get('/api/public-settings', (req, res) => {
  readSiteSettings((err, settings) => {
    if (err) return res.status(500).json({ error: 'Не удалось загрузить контакты' });
    res.json(settings);
  });
});

app.get('/api/content', requireAdmin, (req, res) => {
  readSiteSettings((err, settings) => {
    if (err) return res.status(500).json({ error: 'Не удалось загрузить данные сайта' });
    res.json(settings);
  });
});

app.put('/api/content', requireAdmin, async (req, res) => {
  const limits = { mainTitle: 140, siteDescription: 320, mainPhone: 40, whatsappPhone: 40, address: 180, email: 160, workingHours: 120 };
  const optionalLimits = { promoTextRu: 320, promoTextKk: 320, workingHoursKk: 120 };
  const values = {};
  for (const [key, max] of Object.entries(limits)) {
    const value = typeof req.body?.[key] === 'string' ? req.body[key].trim().slice(0, max) : '';
    if (!value) return res.status(400).json({ error: `Заполните поле «${key}»` });
    values[key] = value;
  }
  for (const [key, max] of Object.entries(optionalLimits)) values[key] = typeof req.body?.[key] === 'string' ? req.body[key].trim().slice(0, max) : '';
  const priceList = normalizePriceList(req.body?.priceList);
  if (req.body?.priceList !== undefined && !priceList) return res.status(400).json({ error: 'Некорректный список цен. Проверьте название и цену каждой позиции.' });
  if (priceList) values.priceList = priceList;
  if (req.body?.schedule !== undefined) {
    const schedule = normalizeSchedule(req.body.schedule);
    if (!schedule) return res.status(400).json({ error: 'Некорректное расписание. Проверьте время открытия и закрытия для каждого дня.' });
    values.schedule = schedule;
  }
  try {
    await Promise.all(Object.entries(values).map(([key, value]) => new Promise((resolve, reject) => {
      db.run('INSERT OR REPLACE INTO content (key, value, type) VALUES (?, ?, ?)', [key, value, 'text'], err => err ? reject(err) : resolve());
    })));
    res.json({ ok: true, settings: values });
  } catch (error) {
    console.error('Could not save site settings:', error.message);
    res.status(500).json({ error: 'Не удалось сохранить данные сайта' });
  }
});

app.get('/api/dashboard', requireAdmin, (req, res) => {
  db.get(`SELECT COUNT(*) AS total, SUM(CASE WHEN date(created_at)=date('now','localtime') THEN 1 ELSE 0 END) AS today, SUM(CASE WHEN strftime('%Y-%m',created_at)=strftime('%Y-%m','now','localtime') THEN 1 ELSE 0 END) AS month FROM booking_metrics`, [], (err, stats) => {
    if (err) return res.status(500).json({ error: 'Не удалось загрузить сводку' });
    res.json({ today: stats.today || 0, total: stats.total || 0, pending: stats.month || 0 });
  });
});

// Static files: serve only public assets, never the project root
// (prevents exposure of server.js, database.db, package.json and other internals)
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Explicit routes for HTML files
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});
app.get('/login.html', (req, res) => res.redirect(301, '/login'));

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});
app.get('/admin.html', (req, res) => res.redirect(301, '/admin'));

app.get('/privacy', (req, res) => {
  res.sendFile(path.join(__dirname, 'privacy.html'));
});
app.get('/privacy.html', (req, res) => res.redirect(301, '/privacy'));

app.get('/index.html', (req, res) => res.redirect(301, '/'));

app.get('/robots.txt', (req, res) => res.sendFile(path.join(__dirname, 'robots.txt')));
app.get('/sitemap.xml', (req, res) => res.sendFile(path.join(__dirname, 'sitemap.xml')));

const ADMIN_SETTING_DEFAULTS = { autoRefreshSeconds: 30, bookingLimit: 100 };
function readAdminSettings(callback) {
  db.all('SELECT key, value FROM admin_settings', [], (err, rows) => {
    if (err) return callback(err);
    const settings = { ...ADMIN_SETTING_DEFAULTS };
    rows.forEach(row => {
      if (Object.prototype.hasOwnProperty.call(settings, row.key)) settings[row.key] = Number(row.value);
    });
    callback(null, settings);
  });
}

app.get('/api/settings', requireAdmin, (req, res) => {
  readAdminSettings((err, settings) => {
    if (err) return res.status(500).json({ error: 'Не удалось загрузить настройки' });
    res.json(settings);
  });
});

app.put('/api/settings', requireAdmin, async (req, res) => {
  const { autoRefreshSeconds, bookingLimit } = req.body || {};
  const allowed = {
    autoRefreshSeconds: [0, 30, 60],
    bookingLimit: [25, 50, 100, 250, 500]
  };
  if (!allowed.autoRefreshSeconds.includes(Number(autoRefreshSeconds)) || !allowed.bookingLimit.includes(Number(bookingLimit))) {
    return res.status(400).json({ error: 'Проверьте значения настроек' });
  }
  const settings = { autoRefreshSeconds: Number(autoRefreshSeconds), bookingLimit: Number(bookingLimit) };
  try {
    await Promise.all(Object.entries(settings).map(([key, value]) => new Promise((resolve, reject) => {
      db.run('INSERT OR REPLACE INTO admin_settings (key, value) VALUES (?, ?)', [key, String(value)], err => err ? reject(err) : resolve());
    })));
    res.json({ ok: true, settings });
  } catch (error) {
    console.error('Could not save admin settings:', error.message);
    res.status(500).json({ error: 'Не удалось сохранить настройки' });
  }
});

app.get('/api/analytics', requireAdmin, async (req, res) => {
  const all = (sql, params = []) => new Promise((resolve, reject) => db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows)));
  const get = (sql, params = []) => new Promise((resolve, reject) => db.get(sql, params, (err, row) => err ? reject(err) : resolve(row)));
  try {
    const [bookingDaily, bookingServices, bookingStatuses, bookingTotals] = await Promise.all([
      all(`SELECT date(created_at) AS day, COUNT(*) AS count FROM bookings
        WHERE date(created_at) >= date('now','-13 days') AND status != 'Отменена'
        GROUP BY date(created_at) ORDER BY date(created_at)`),
      all(`SELECT service_type AS service, COUNT(*) AS count FROM bookings
        WHERE status != 'Отменена' GROUP BY service_type ORDER BY count DESC`),
      all('SELECT status, COUNT(*) AS count FROM bookings GROUP BY status ORDER BY count DESC'),
      get(`SELECT COUNT(*) AS total,
        SUM(CASE WHEN date(created_at)=date('now','localtime') THEN 1 ELSE 0 END) AS today,
        SUM(CASE WHEN status='Завершена' THEN 1 ELSE 0 END) AS completed,
        SUM(CASE WHEN status IN ('Новая','В работе') THEN 1 ELSE 0 END) AS active
        FROM bookings`)
    ]);
    const [metricDays, metricServices, metricTotals] = await Promise.all([
      all(`SELECT date(created_at) AS day, COUNT(*) AS count FROM booking_metrics WHERE date(created_at)>=date('now','-13 days') GROUP BY date(created_at)`),
      all(`SELECT vehicle_type AS service, COUNT(*) AS count FROM booking_metrics GROUP BY vehicle_type`),
      get(`SELECT COUNT(*) AS total, SUM(CASE WHEN date(created_at)=date('now','localtime') THEN 1 ELSE 0 END) AS today FROM booking_metrics`)
    ]);
    const dayCounts = new Map();
    [...bookingDaily, ...metricDays].forEach(row => dayCounts.set(row.day, (dayCounts.get(row.day)||0)+Number(row.count)));
    const serviceCounts = new Map();
    [...bookingServices, ...metricServices].forEach(row => serviceCounts.set(row.service, (serviceCounts.get(row.service)||0)+Number(row.count)));
    const total = Number(bookingTotals.total||0)+Number(metricTotals.total||0);
    const today = Number(bookingTotals.today||0)+Number(metricTotals.today||0);
    res.json({ bookingDaily:[...dayCounts].map(([day,count])=>({day,count})), bookingServices:[...serviceCounts].map(([service,count])=>({service,count})), bookingStatuses:[],
      bookingTotals: { total, today, completed: bookingTotals.completed || 0, active: 0, completionRate: total ? Math.round((bookingTotals.completed || 0) * 100 / total) : 0 } });
  } catch (error) {
    console.error('Could not load analytics:', error.message);
    res.status(500).json({ error: 'Не удалось загрузить аналитику' });
  }
});

app.get('/api/admin/backup', requireAdmin, (req, res) => {
  return res.status(404).json({ error: 'В панели доступны только аналитика и настройки сайта' });
  const filename = `atc-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.db`;
  const backupPath = path.join(os.tmpdir(), `atc-${crypto.randomBytes(10).toString('hex')}.db`);
  db.backup(backupPath, error => {
    if (error) {
      console.error('Could not create database backup:', error.message);
      return res.status(500).json({ error: 'Не удалось создать резервную копию' });
    }
    res.setHeader('Content-Type', 'application/vnd.sqlite3');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-store');
    const stream = fs.createReadStream(backupPath);
    stream.on('error', streamError => {
      console.error('Could not stream database backup:', streamError.message);
      if (!res.headersSent) res.status(500).json({ error: 'Не удалось скачать резервную копию' });
      else res.destroy(streamError);
    });
    stream.on('close', () => fs.unlink(backupPath, () => {}));
    stream.pipe(res);
  });
});

// Start server
const PORT = process.env.PORT || 3003;
server.listen(PORT, () => {
  console.log(`🚀 Backend server running on port ${PORT}`);
  console.log(`📁 Serving files from: ${path.join(__dirname)}`);
  console.log(`🔗 Admin panel: http://localhost:${PORT}/login`);
  console.log(`🌐 Main site: http://localhost:${PORT}/`);
});

module.exports = app;
