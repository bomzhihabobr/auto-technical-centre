#!/usr/bin/env node

/**
 * Auto Technical Centre - Backend Server
 * Запуск: node server.js
 *
 * Функции:
 * - REST API для админ-панели
 * - Аутентификация JWT
 * - SQLite база данных
 */

console.log('🚀 Запуск ATC Backend Server...');
console.log('📁 Проверка файлов...');

// Проверяем наличие package.json
const fs = require('fs');
const path = require('path');

const requiredFiles = [
    'server.js',
    'admin.html',
    'login.html',
    'package.json'
];

let missingFiles = [];
requiredFiles.forEach(file => {
    if (!fs.existsSync(path.join(__dirname, file))) {
        missingFiles.push(file);
    }
});

if (missingFiles.length > 0) {
    console.error('❌ Отсутствуют файлы:', missingFiles.join(', '));
    console.log('📝 Убедитесь, что все файлы в одной папке');
    process.exit(1);
}

console.log('✅ Все файлы найдены');

// Проверяем зависимости
try {
    require('express');
    require('cors');
    require('jsonwebtoken');
    require('bcrypt');
    require('sqlite3');
    console.log('✅ Зависимости установлены');
} catch (error) {
    console.log('⚠️  Установите зависимости: npm install');
    console.log('📦 Требуемые пакеты: express, cors, jsonwebtoken, bcrypt, sqlite3');
}

console.log('🔧 Инициализация базы данных...');
console.log('👤 Создание пользователя admin:admin123');
console.log('🌐 Сервер будет доступен на http://localhost:3003');
console.log('🔐 Админ-панель: http://localhost:3003/login.html');
console.log('');
console.log('📋 Инструкции:');
console.log('1. Откройте http://localhost:3003/login.html');
console.log('2. Войдите с логином: admin, паролем: admin123');
console.log('3. Управляйте сайтом в реальном времени');
console.log('');
console.log('🎯 Доступные функции:');
console.log('- Редактирование контента сайта');
console.log('- Просмотр сообщений клиентов');
console.log('- Аналитика и статистика');
console.log('- Настройки системы');
console.log('');
console.log('⚡ Для остановки сервера: Ctrl+C');
console.log('🚀 Готов к запуску!');

// Запускаем сервер
require('./server.js');