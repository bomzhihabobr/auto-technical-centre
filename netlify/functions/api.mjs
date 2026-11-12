import { getDatabase } from "@netlify/database";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const TIME_ZONE = "Asia/Qyzylorda";
const SITE_DEFAULTS = {
  mainTitle: "Техосмотр в Астане — Қобыз, 36 | Auto Technical Centre",
  siteDescription: "Пройдите техосмотр автомобиля в Астане по адресу Қобыз, 36. Выберите свободное время онлайн, посмотрите карту проезда и свяжитесь с Auto Technical Centre.",
  mainPhone: "+7 776 848 27 44", whatsappPhone: "+7 776 848 27 44", address: "г. Астана, Қобыз, 36",
  email: "atc@at-c.kz", workingHours: "Ежедневно с 09:00 до 19:00", promoTextRu: "", promoTextKk: "",
};
const SETTING_DEFAULTS = { autoRefreshSeconds: 30, bookingLimit: 100 };
const STATUSES = ["Новая", "В работе", "Завершена", "Отменена"];
const VEHICLES = ["passenger", "commercial", "bus", "motorcycle", "trailer"];

const respond = (data, status = 200, headers = {}) => Response.json(data, { status, headers: { "Cache-Control": "no-store", ...headers } });
const fail = (message, status = 500) => respond({ error: message }, status);
const clean = (value, max) => typeof value === "string" ? value.trim().slice(0, max) : "";
function siteNow() {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date()).map(x => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, minutes: Number(p.hour) * 60 + Number(p.minute) };
}
function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}
function isFuture(date, time) {
  const now = siteNow();
  if (date !== now.date) return date > now.date;
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute > now.minutes;
}
function timeSlots(hours) {
  const m = String(hours || "").match(/(\d{1,2}):([0-5]\d).*?(\d{1,2}):([0-5]\d)/);
  const start = m ? Number(m[1]) * 60 + Number(m[2]) : 540;
  const end = m ? Number(m[3]) * 60 + Number(m[4]) : 1140;
  return Array.from({ length: Math.max(0, Math.ceil((end - start) / 30)) }, (_, i) => {
    const n = start + i * 30;
    return `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;
  });
}
async function siteSettings(db) {
  const rows = await db.sql`SELECT key, value FROM content`;
  const value = { ...SITE_DEFAULTS };
  for (const row of rows) if (Object.hasOwn(value, row.key)) value[row.key] = row.value;
  if (value.mainTitle === "Техосмотр в Астане — Auto Technical Centre") value.mainTitle = SITE_DEFAULTS.mainTitle;
  if (value.siteDescription === "Специализированный центр техосмотра в Астане. Запишитесь онлайн или по телефону.") value.siteDescription = SITE_DEFAULTS.siteDescription;
  return value;
}
async function seedAdmin(db) {
  const username = clean(process.env.ADMIN_USERNAME || "admin", 80);
  const hash = process.env.ADMIN_PASSWORD_HASH;
  if (!username || !hash) return false;
  await db.sql`INSERT INTO users (username, password, role) VALUES (${username}, ${hash}, 'admin') ON CONFLICT (username) DO NOTHING`;
  return true;
}
function getAdmin(request) {
  if (!process.env.JWT_SECRET) throw Object.assign(new Error("Панель администратора не настроена"), { status: 503 });
  const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  try {
    const claims = jwt.verify(token, process.env.JWT_SECRET);
    if (claims.role !== "admin") throw Object.assign(new Error("Доступ запрещён"), { status: 403 });
    return claims;
  }
  catch (err) {
    if (err?.status) throw err;
    throw Object.assign(new Error("Требуется вход в панель администратора"), { status: 401 });
  }
}

export default async function handler(request) {
  if (request.method === "OPTIONS") return new Response(null, { status: 204 });
  try {
    const db = getDatabase();
    const url = new URL(request.url);
    const path = url.pathname.replace(/^\/\.netlify\/functions\/api/, "").replace(/^\/api/, "") || "/";
    const method = request.method.toUpperCase();
    const body = ["POST", "PUT", "PATCH"].includes(method) ? await request.json().catch(() => ({})) : {};

    if (method === "POST" && path === "/login") {
      if (!process.env.JWT_SECRET) return fail("Панель администратора не настроена", 503);
      if (!(await seedAdmin(db))) return fail("Добавьте ADMIN_PASSWORD_HASH в переменные Netlify", 503);
      const username = clean(body.username, 80), password = clean(body.password, 300);
      if (!username || !password) return fail("Введите логин и пароль", 400);
      const rows = await db.sql`SELECT id, username, password, role FROM users WHERE username = ${username} LIMIT 1`;
      const user = rows[0];
      if (!user || !(await bcrypt.compare(password, user.password))) return fail("Неверный логин или пароль", 401);
      return respond({ token: jwt.sign({ id: user.id, username: user.username, role: user.role }, process.env.JWT_SECRET, { expiresIn: "12h" }) });
    }

    if (method === "GET" && path === "/public-settings") return respond(await siteSettings(db));
    if (method === "GET" && path === "/availability") {
      const date = url.searchParams.get("date") || "";
      if (!validDate(date)) return fail("Укажите корректную дату", 400);
      const [busy, settings] = await Promise.all([
        db.sql`SELECT time FROM bookings WHERE date = ${date}::date AND status <> 'Отменена' UNION SELECT time FROM booking_slots WHERE date = ${date}::date`, siteSettings(db),
      ]);
      const used = new Set(busy.map(row => row.time));
      return respond({ date, intervalMinutes: 30, availableTimes: timeSlots(settings.workingHours).filter(t => !used.has(t) && isFuture(date, t)) });
    }
    if (method === "POST" && path === "/bookings") {
      const b = {
        name: clean(body.name, 120), phone: clean(body.phone, 40), car: clean(body.car, 120),
        vehicleType: clean(body.vehicleType, 50), serviceType: "inspection",
        date: clean(body.date, 20), time: clean(body.time, 10), comment: clean(body.comment, 1000), consent: body.consent === true,
      };
      if (!b.name || !b.phone || !b.vehicleType || !b.date || !b.time) return fail("Заполните обязательные поля и выберите тип транспорта", 400);
      if (!VEHICLES.includes(b.vehicleType)) return fail("Выберите тип транспорта из списка", 400);
      if (!b.consent) return fail("Подтвердите согласие на обработку данных", 400);
      if (!validDate(b.date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(b.time)) return fail("Проверьте дату и время записи", 400);
      if (!isFuture(b.date, b.time)) return fail("Выбранное время уже прошло", 400);
      if (!timeSlots((await siteSettings(db)).workingHours).includes(b.time)) return fail("Выберите время из доступных интервалов", 400);
      const token = process.env.TELEGRAM_BOT_TOKEN, chatId = process.env.CHAT_ID;
      if (!token || !chatId) return fail("Приём заявок временно не настроен. Позвоните нам.", 503);
      const reserved = await db.sql`INSERT INTO booking_slots (date,time) VALUES (${b.date}::date,${b.time}) ON CONFLICT (date,time) DO NOTHING RETURNING id`;
      if (!reserved.length) return fail("Это время только что заняли. Выберите другой интервал.", 409);
      const id = reserved[0].id;
      const message = [`Новая заявка на техосмотр №${id}`, `Имя: ${b.name}`, `Телефон: ${b.phone}`, `Автомобиль: ${b.car || "не указан"}`, `Категория: ${b.vehicleType}`, `Дата и время: ${b.date} ${b.time}`, `Комментарий: ${b.comment || "нет"}`].join("\n");
      try {
        const telegram = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: chatId, text: message }) });
        const result = await telegram.json();
        if (!telegram.ok || !result.ok) throw new Error("Telegram rejected message");
        await db.sql`INSERT INTO booking_metrics (vehicle_type) VALUES (${b.vehicleType})`;
      } catch {
        await db.sql`DELETE FROM booking_slots WHERE id = ${id}`;
        return fail("Не удалось отправить заявку. Попробуйте ещё раз или позвоните нам.", 502);
      }
      return respond({ ok: true, id }, 201);
    }

    const admin = getAdmin(request);
    if (path === "/bookings" || /^\/bookings\/\d+(?:\/history)?$/.test(path)) return fail("Персональные заявки доступны только в Telegram", 404);
    if (path === "/admin/backup") return fail("В панели доступны только аналитика и настройки сайта", 404);
    if (method === "GET" && path === "/bookings") {
      const limit = Math.max(1, Math.min(500, Number.parseInt(url.searchParams.get("limit"), 10) || 100));
      return respond(await db.sql`SELECT id, name, phone, car, vehicle_type, service_type, date::text AS date, time, comment, consent_at, status, created_at::text AS created_at FROM bookings ORDER BY id DESC LIMIT ${limit}`);
    }
    const history = path.match(/^\/bookings\/(\d+)\/history$/);
    if (method === "GET" && history) return respond(await db.sql`SELECT action, old_status, new_status, actor, created_at::text AS created_at FROM booking_activity WHERE booking_id = ${Number(history[1])} ORDER BY id DESC`);
    const bookingRoute = path.match(/^\/bookings\/(\d+)$/);
    if (method === "PATCH" && bookingRoute) {
      const id = Number(bookingRoute[1]), status = body.status;
      if (!STATUSES.includes(status)) return fail("Некорректный статус заявки", 400);
      const found = await db.sql`SELECT id, status, date::text AS date, time FROM bookings WHERE id = ${id}`;
      const booking = found[0];
      if (!booking) return fail("Заявка не найдена", 404);
      if (status !== "Отменена") {
        const conflict = await db.sql`SELECT id FROM bookings WHERE date = ${booking.date}::date AND time = ${booking.time} AND id <> ${id} AND status <> 'Отменена' LIMIT 1`;
        if (conflict.length) return fail("Нельзя активировать заявку: это время уже занято другой записью", 409);
      }
      await db.sql`UPDATE bookings SET status = ${status} WHERE id = ${id}`;
      if (booking.status !== status) await db.sql`INSERT INTO booking_activity (booking_id, action, old_status, new_status, actor) VALUES (${id}, 'status_changed', ${booking.status}, ${status}, ${clean(admin.username, 80) || "admin"})`;
      return respond({ ok: true });
    }
    if (method === "DELETE" && bookingRoute) {
      const rows = await db.sql`DELETE FROM bookings WHERE id = ${Number(bookingRoute[1])} RETURNING id`;
      return rows.length ? respond({ ok: true }) : fail("Заявка не найдена", 404);
    }
    if (method === "GET" && path === "/content") return respond(await siteSettings(db));
    if (method === "PUT" && path === "/content") {
      const limits = { mainTitle: 140, siteDescription: 320, mainPhone: 40, whatsappPhone: 40, address: 180, email: 160, workingHours: 120 }, values = {};
      for (const [key, max] of Object.entries(limits)) {
        values[key] = clean(body[key], max);
        if (!values[key]) return fail(`Заполните поле «${key}»`, 400);
      }
      values.promoTextRu = clean(body.promoTextRu, 320);
      values.promoTextKk = clean(body.promoTextKk, 320);
      for (const [key, value] of Object.entries(values)) await db.sql`INSERT INTO content (key, value, type) VALUES (${key}, ${value}, 'text') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, type = EXCLUDED.type`;
      return respond({ ok: true, settings: values });
    }
    if (method === "GET" && path === "/dashboard") {
      const today = siteNow().date;
      const stats = await db.sql`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE (created_at AT TIME ZONE 'Asia/Qyzylorda')::date = ${today}::date)::int AS today, COUNT(*) FILTER (WHERE date_trunc('month',created_at AT TIME ZONE 'Asia/Qyzylorda') = date_trunc('month',${today}::date::timestamp))::int AS month FROM booking_metrics`;
      return respond({ ...stats[0], pending: stats[0]?.month || 0 });
    }
    if (method === "GET" && path === "/settings") {
      const rows = await db.sql`SELECT key, value FROM admin_settings`, settings = { ...SETTING_DEFAULTS };
      for (const row of rows) if (Object.hasOwn(settings, row.key)) settings[row.key] = Number(row.value);
      return respond(settings);
    }
    if (method === "PUT" && path === "/settings") {
      const values = { autoRefreshSeconds: Number(body.autoRefreshSeconds), bookingLimit: Number(body.bookingLimit) };
      if (![0, 30, 60].includes(values.autoRefreshSeconds) || ![25, 50, 100, 250, 500].includes(values.bookingLimit)) return fail("Проверьте значения настроек", 400);
      for (const [key, value] of Object.entries(values)) await db.sql`INSERT INTO admin_settings (key, value) VALUES (${key}, ${String(value)}) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`;
      return respond({ ok: true, settings: values });
    }
    if (method === "GET" && path === "/analytics") {
      const today = siteNow().date;
      const [oldDaily, oldServices, totals, metricDaily, metricServices, metricTotals] = await Promise.all([
        db.sql`SELECT (created_at AT TIME ZONE 'Asia/Qyzylorda')::date::text AS day, COUNT(*)::int AS count FROM bookings WHERE (created_at AT TIME ZONE 'Asia/Qyzylorda')::date BETWEEN (${today}::date - 13) AND ${today}::date AND status <> 'Отменена' GROUP BY 1 ORDER BY 1`,
        db.sql`SELECT service_type AS service, COUNT(*)::int AS count FROM bookings WHERE status <> 'Отменена' GROUP BY service_type ORDER BY count DESC`,
        db.sql`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE (created_at AT TIME ZONE 'Asia/Qyzylorda')::date = ${today}::date)::int AS today, COUNT(*) FILTER (WHERE status = 'Завершена')::int AS completed, COUNT(*) FILTER (WHERE status IN ('Новая','В работе'))::int AS active FROM bookings`,
        db.sql`SELECT (created_at AT TIME ZONE 'Asia/Qyzylorda')::date::text AS day, COUNT(*)::int AS count FROM booking_metrics WHERE (created_at AT TIME ZONE 'Asia/Qyzylorda')::date BETWEEN (${today}::date - 13) AND ${today}::date GROUP BY 1`,
        db.sql`SELECT vehicle_type AS service, COUNT(*)::int AS count FROM booking_metrics GROUP BY vehicle_type`,
        db.sql`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE (created_at AT TIME ZONE 'Asia/Qyzylorda')::date = ${today}::date)::int AS today FROM booking_metrics`,
      ]);
      const t = totals[0] || {}, mt = metricTotals[0] || {}, byDay = new Map(), byService = new Map();
      [...oldDaily, ...metricDaily].forEach(x => byDay.set(x.day, (byDay.get(x.day)||0)+x.count));
      [...oldServices, ...metricServices].forEach(x => byService.set(x.service, (byService.get(x.service)||0)+x.count));
      const total = (t.total||0)+(mt.total||0);
      return respond({ bookingDaily:[...byDay].map(([day,count])=>({day,count})), bookingServices:[...byService].map(([service,count])=>({service,count})), bookingStatuses:[], bookingTotals: { total, today: (t.today||0)+(mt.today||0), completed: t.completed || 0, active: 0, completionRate: total ? Math.round((t.completed||0)*100/total) : 0 } });
    }
    if (method === "GET" && path === "/admin/backup") {
      const [bookings, activity, content, settings] = await Promise.all([
        db.sql`SELECT id, name, phone, car, vehicle_type, service_type, date::text AS date, time, comment, consent_at, status, created_at::text AS created_at FROM bookings ORDER BY id`,
        db.sql`SELECT id, booking_id, action, old_status, new_status, actor, created_at::text AS created_at FROM booking_activity ORDER BY id`,
        db.sql`SELECT key, value, type FROM content ORDER BY key`,
        db.sql`SELECT key, value FROM admin_settings ORDER BY key`,
      ]);
      const file = `atc-backup-${new Date().toISOString().slice(0, 10)}.json`;
      return new Response(JSON.stringify({ exportedAt: new Date().toISOString(), bookings, activity, content, settings }, null, 2), { headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="${file}"`, "Cache-Control": "no-store" } });
    }
    return fail("Раздел API не найден", 404);
  } catch (err) {
    if (err?.status) return fail(err.message, err.status);
    if (err?.code === "23505") return fail("Это время только что заняли. Выберите другой интервал.", 409);
    console.error("Netlify API error:", err?.message || err);
    return fail("Не удалось обработать запрос. Попробуйте ещё раз.", 500);
  }
}
