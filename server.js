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

const app = express();
const server = http.createServer(app);

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

// Middleware
app.use(cors());
app.use(express.json());

function requireAdmin(req, res, next) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  try {
    req.admin = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Требуется вход в панель администратора' });
  }
}

app.post('/api/login', (req, res) => {
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

app.post('/api/bookings', (req, res) => {
  const clean = (v, max) => typeof v === 'string' ? v.trim().slice(0, max) : '';
  const booking = {
    name: clean(req.body?.name, 120), phone: clean(req.body?.phone, 40),
    car: clean(req.body?.car, 120), vehicleType: clean(req.body?.vehicleType, 50), serviceType: clean(req.body?.serviceType, 50), date: clean(req.body?.date, 20),
    consent: req.body?.consent === true,
    time: clean(req.body?.time, 10), comment: clean(req.body?.comment, 1000)
  };
  if (!booking.name || !booking.phone || !booking.vehicleType || !booking.serviceType || !booking.date || !booking.time) return res.status(400).json({ error: 'Заполните обязательные поля и выберите тип транспорта и услугу' });
  if (!['passenger','commercial','bus','motorcycle','trailer'].includes(booking.vehicleType) || !['inspection','diagnostics','insurance','tire-service'].includes(booking.serviceType)) return res.status(400).json({ error: 'Выберите тип транспорта и услугу из списка' });
  if (!booking.consent) return res.status(400).json({ error: 'Подтвердите согласие на обработку данных' });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(booking.date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(booking.time)) return res.status(400).json({ error: 'Проверьте дату и время записи' });
  const parsedDate = new Date(`${booking.date}T00:00:00Z`);
  if (Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== booking.date) return res.status(400).json({ error: 'Указана некорректная дата' });
  readSiteSettings((settingsError, settings) => {
    if (settingsError) return res.status(500).json({ error: 'Не удалось проверить расписание' });
    const times = buildAppointmentTimes(settings.workingHours);
    if (!times.includes(booking.time)) return res.status(400).json({ error: 'Выберите время из доступных интервалов' });
    if (!isFutureAppointment(booking.date, booking.time)) return res.status(400).json({ error: 'Выбранное время уже прошло' });
    db.run(`INSERT INTO bookings (name, phone, car, vehicle_type, service_type, date, time, comment, consent_at)
      SELECT ?, ?, ?, ?, ?, ?, ?, ?, ? WHERE NOT EXISTS (
        SELECT 1 FROM bookings WHERE date = ? AND time = ? AND status != 'Отменена'
      )`,
    [booking.name, booking.phone, booking.car, booking.vehicleType, booking.serviceType, booking.date, booking.time, booking.comment, new Date().toISOString(), booking.date, booking.time], function (err) {
      if (err) return res.status(500).json({ error: 'Не удалось сохранить заявку. Попробуйте ещё раз.' });
      if (!this.changes) return res.status(409).json({ error: 'Это время только что заняли. Выберите другой интервал.' });
      const bookingId = this.lastID;
      db.run('INSERT INTO booking_activity (booking_id, action, new_status, actor) VALUES (?, ?, ?, ?)', [bookingId, 'created', 'Новая', 'client'], historyError => {
        if (historyError) console.error('Could not record booking creation:', historyError.message);
        res.status(201).json({ ok: true, id: bookingId });
      });
    });
  });
});

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

const SITE_DEFAULTS = {
  mainTitle: 'Техосмотр в Астане — Auto Technical Centre',
  siteDescription: 'Специализированный центр техосмотра в Астане. Запишитесь онлайн или по телефону.',
  mainPhone: '8 707 243 3010',
  address: 'г. Астана, Қобыз, 36',
  email: 'atc@at-c.kz',
  workingHours: 'Ежедневно с 09:00 до 19:00'
};
function readSiteSettings(callback) {
  db.all('SELECT key, value FROM content', [], (err, rows) => {
    if (err) return callback(err);
    const settings = { ...SITE_DEFAULTS };
    rows.forEach(row => { if (Object.prototype.hasOwnProperty.call(settings, row.key)) settings[row.key] = row.value; });
    callback(null, settings);
  });
}

function buildAppointmentTimes(workingHours) {
  const matches = String(workingHours || '').match(/(\d{1,2}):([0-5]\d).*?(\d{1,2}):([0-5]\d)/);
  const start = matches ? Number(matches[1]) * 60 + Number(matches[2]) : 9 * 60;
  const end = matches ? Number(matches[3]) * 60 + Number(matches[4]) : 19 * 60;
  const slots = [];
  for (let minute = start; minute < end; minute += 30) slots.push(`${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`);
  return slots;
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
  db.all("SELECT time FROM bookings WHERE date = ? AND status != 'Отменена'", [date], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Не удалось проверить свободное время' });
    readSiteSettings((settingsError, settings) => {
      if (settingsError) return res.status(500).json({ error: 'Не удалось загрузить расписание' });
      const busy = new Set(rows.map(row => row.time));
      const availableTimes = buildAppointmentTimes(settings.workingHours).filter(time => !busy.has(time) && isFutureAppointment(date, time));
      res.json({ date, availableTimes, intervalMinutes: 30 });
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
  const limits = { mainTitle: 140, siteDescription: 320, mainPhone: 40, address: 180, email: 160, workingHours: 120 };
  const values = {};
  for (const [key, max] of Object.entries(limits)) {
    const value = typeof req.body?.[key] === 'string' ? req.body[key].trim().slice(0, max) : '';
    if (!value) return res.status(400).json({ error: `Заполните поле «${key}»` });
    values[key] = value;
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
  db.get(`SELECT COUNT(*) AS total,
    SUM(CASE WHEN date(created_at) = date('now','localtime') THEN 1 ELSE 0 END) AS today,
    SUM(CASE WHEN status IN ('Новая','В работе') THEN 1 ELSE 0 END) AS pending
    FROM bookings`, [], (err, stats) => {
    if (err) return res.status(500).json({ error: 'Не удалось загрузить сводку' });
    db.all('SELECT id, name, phone, car, vehicle_type, service_type, date, time, status FROM bookings ORDER BY id DESC LIMIT 5', [], (recentErr, recent) => {
      if (recentErr) return res.status(500).json({ error: 'Не удалось загрузить последние заявки' });
      res.json({ today: stats.today || 0, total: stats.total || 0, pending: stats.pending || 0,
        recent });
    });
  });
});

// Static files middleware - serve HTML, CSS, JS files
app.use(express.static(path.join(__dirname), { index: false }));

// Static files for assets
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Explicit routes for HTML files
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/login.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/admin.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

app.get('/index.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

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
      all(`SELECT date AS day, COUNT(*) AS count FROM bookings
        WHERE date >= date('now','-13 days') AND date <= date('now','+30 days')
        AND status != 'Отменена' GROUP BY date ORDER BY date`),
      all(`SELECT service_type AS service, COUNT(*) AS count FROM bookings
        WHERE status != 'Отменена' GROUP BY service_type ORDER BY count DESC`),
      all('SELECT status, COUNT(*) AS count FROM bookings GROUP BY status ORDER BY count DESC'),
      get(`SELECT COUNT(*) AS total,
        SUM(CASE WHEN date(created_at)=date('now','localtime') THEN 1 ELSE 0 END) AS today,
        SUM(CASE WHEN status='Завершена' THEN 1 ELSE 0 END) AS completed,
        SUM(CASE WHEN status IN ('Новая','В работе') THEN 1 ELSE 0 END) AS active
        FROM bookings`)
    ]);
    res.json({ bookingDaily, bookingServices, bookingStatuses,
      bookingTotals: { total: bookingTotals.total || 0, today: bookingTotals.today || 0, completed: bookingTotals.completed || 0, active: bookingTotals.active || 0,
        completionRate: bookingTotals.total ? Math.round((bookingTotals.completed || 0) * 100 / bookingTotals.total) : 0 } });
  } catch (error) {
    console.error('Could not load analytics:', error.message);
    res.status(500).json({ error: 'Не удалось загрузить аналитику' });
  }
});

app.get('/api/admin/backup', requireAdmin, (req, res) => {
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
  console.log(`🔗 Admin panel: http://localhost:${PORT}/login.html`);
  console.log(`🌐 Main site: http://localhost:${PORT}/index.html`);
});

module.exports = app;
