const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();
const WebSocket = require('ws');
const http = require('http');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// JWT Secret
const JWT_SECRET = 'your-super-secret-jwt-key-change-this';

// Database setup
const db = new sqlite3.Database('./database.db');

// Middleware
app.use(cors());
app.use(express.json());

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

// Advanced ChatGPT-like Chatbot System
class ConversationManager {
  constructor() {
    this.conversations = new Map(); // userId -> conversation history
    this.maxHistoryLength = 50; // Maximum messages to remember
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000); // Cleanup every 5 minutes
  }

  // Get or create conversation for user
  getConversation(userId) {
    if (!this.conversations.has(userId)) {
      this.conversations.set(userId, {
        messages: [],
        context: {},
        lastActivity: Date.now()
      });
    }
    return this.conversations.get(userId);
  }

  // Add message to conversation
  addMessage(userId, message, response, metadata = {}) {
    const conversation = this.getConversation(userId);

    const messageObj = {
      id: Date.now() + Math.random(),
      type: 'user',
      content: message,
      timestamp: new Date().toISOString(),
      metadata
    };

    const responseObj = {
      id: Date.now() + Math.random(),
      type: 'bot',
      content: response,
      timestamp: new Date().toISOString(),
      metadata
    };

    conversation.messages.push(messageObj, responseObj);
    conversation.lastActivity = Date.now();

    // Keep only recent messages
    if (conversation.messages.length > this.maxHistoryLength * 2) {
      conversation.messages = conversation.messages.slice(-this.maxHistoryLength * 2);
    }

    return { message: messageObj, response: responseObj };
  }

  // Get conversation context
  getContext(userId) {
    const conversation = this.getConversation(userId);
    return {
      recentMessages: conversation.messages.slice(-10),
      context: conversation.context,
      hasHistory: conversation.messages.length > 0
    };
  }

  // Update conversation context
  updateContext(userId, contextUpdate) {
    const conversation = this.getConversation(userId);
    conversation.context = { ...conversation.context, ...contextUpdate };
  }

  // Cleanup old conversations
  cleanup() {
    const now = Date.now();
    const maxAge = 30 * 60 * 1000; // 30 minutes

    for (const [userId, conversation] of this.conversations.entries()) {
      if (now - conversation.lastActivity > maxAge) {
        this.conversations.delete(userId);
      }
    }
  }

  // Get conversation statistics
  getStats() {
    return {
      totalConversations: this.conversations.size,
      totalMessages: Array.from(this.conversations.values()).reduce((sum, conv) => sum + conv.messages.length, 0)
    };
  }
}

// Advanced Intent Recognition System
class IntentAnalyzer {
  constructor() {
    this.intentPatterns = {
      greeting: {
        patterns: ['привет', 'здравствуйте', 'добрый день', 'доброе утро', 'добрый вечер', 'хай', 'салют', 'hello', 'hi'],
        confidence: 0.9,
        responses: [
          'Здравствуйте! Я чат-бот Auto Technical Centre. Чем могу помочь?',
          'Добрый день! Я помогу вам с информацией о техосмотре.',
          'Приветствую! Готов ответить на ваши вопросы о техосмотре.'
        ]
      },
      booking: {
        patterns: ['запись', 'записаться', 'забронировать', 'время', 'дата', 'когда', 'свободное время', 'book', 'appointment'],
        confidence: 0.8,
        responses: [
          'Вы можете записаться на техосмотр по телефону +7 700 243 30 10 или через форму на сайте.',
          'Для записи выберите удобную дату и время. Мы работаем ежедневно с 9:00 до 19:00.',
          'Запишитесь онлайн или позвоните нам для выбора удобного времени.'
        ]
      },
      pricing: {
        patterns: ['сколько стоит', 'цена', 'стоимость', 'тариф', 'цены', 'оплата', 'денег', 'тенге', 'рублей', 'дорого', 'price', 'cost'],
        confidence: 0.8,
        responses: [
          'Стоимость техосмотра от 3500 тенге. Подробности уточняйте по телефону.',
          'Цена зависит от категории транспортного средства. Звоните для точного расчета.',
          'Мы предлагаем конкурентные цены с возможными скидками для постоянных клиентов.'
        ]
      },
      location: {
        patterns: ['адрес', 'где', 'находитесь', 'локация', 'местоположение', 'как найти', 'как доехать', 'карта', 'место', 'address', 'location'],
        confidence: 0.9,
        responses: [
          'Мы находимся по адресу: г. Астана, Қобыз, 36.',
          'Наш центр расположен в удобном месте с парковкой. Точная локация доступна в 2ГИС.',
          'Найти нас легко - мы в центре города с хорошей транспортной доступностью.'
        ]
      },
      documents: {
        patterns: ['документы', 'бумаги', 'что нужно', 'какие документы', 'паспорт', 'техпаспорт', 'права', 'свидетельство', 'documents', 'papers'],
        confidence: 0.8,
        responses: [
          'Для техосмотра нужны: техпаспорт, удостоверение личности, доверенность (если требуется).',
          'Основные документы: свидетельство о регистрации ТС и документ, удостоверяющий личность.',
          'Не забудьте взять с собой документы на автомобиль и удостоверение личности.'
        ]
      },
      schedule: {
        patterns: ['время работы', 'часы работы', 'график', 'открыты', 'работаете', 'режим работы', 'выходные', 'праздники', 'hours', 'schedule'],
        confidence: 0.9,
        responses: [
          'Работаем ежедневно с 9:00 до 19:00 без выходных.',
          'Наш график: каждый день с 9 утра до 7 вечера, включая выходные.',
          'Мы работаем 7 дней в неделю для вашего удобства.'
        ]
      },
      services: {
        patterns: ['техосмотр', 'то', 'технический осмотр', 'диагностика', 'компьютерная диагностика', 'осаго', 'страховка', 'services', 'inspection'],
        confidence: 0.9,
        responses: [
          'Техосмотр в нашем центре занимает всего 17 минут! Мы работаем с автомобилями всех марок.',
          'Предлагаем полный комплекс услуг: техосмотр, диагностика, ОСАГО.',
          'Специализируемся на быстром и качественном техосмотре всех типов транспортных средств.'
        ]
      },
      goodbye: {
        patterns: ['спасибо', 'пока', 'до свидания', 'всего хорошего', 'bye', 'goodbye', 'thanks'],
        confidence: 0.8,
        responses: [
          'Пожалуйста! Если у вас есть еще вопросы, я с радостью отвечу.',
          'До свидания! Ждем вас в нашем центре техосмотра.',
          'Рад был помочь! Обращайтесь, если понадобится дополнительная информация.'
        ]
      },
      learning: {
        patterns: ['обучить', 'научи', 'добавь', 'запомни', 'learn', 'teach', 'add'],
        confidence: 0.9,
        responses: [
          'Используйте формат: "обучить: [вопрос] -> [ответ]" чтобы научить меня новому ответу.',
          'Я могу учиться новым ответам. Просто напишите "обучить: [вопрос] -> [ответ]"',
          'Хотите меня чему-то научить? Используйте формат обучения!'
        ]
      }
    };
  }

  // Analyze message intent
  analyzeIntent(message) {
    const lowerMessage = message.toLowerCase().trim();
    const results = [];

    for (const [intentName, intentData] of Object.entries(this.intentPatterns)) {
      let maxScore = 0;

      for (const pattern of intentData.patterns) {
        if (lowerMessage.includes(pattern)) {
          const score = pattern.length / lowerMessage.length;
          maxScore = Math.max(maxScore, score);
        }
      }

      if (maxScore > 0.3) { // Minimum threshold
        results.push({
          intent: intentName,
          confidence: maxScore * intentData.confidence,
          data: intentData
        });
      }
    }

    // Sort by confidence
    results.sort((a, b) => b.confidence - a.confidence);

    return results.length > 0 ? results[0] : {
      intent: 'unknown',
      confidence: 0,
      data: { responses: ['Извините, я не совсем понял ваш вопрос. Можете перефразировать?'] }
    };
  }
}

// Advanced Response Generator (ChatGPT-like)
class ResponseGenerator {
  constructor() {
    this.intentAnalyzer = new IntentAnalyzer();
    this.conversationManager = new ConversationManager();
  }

  // Generate contextual response
  generateResponse(userId, message) {
    const conversationContext = this.conversationManager.getContext(userId);
    const intentAnalysis = this.intentAnalyzer.analyzeIntent(message);

    // Add conversation context to analysis
    const enhancedIntent = this.enhanceIntentWithContext(intentAnalysis, conversationContext);

    // Select appropriate response
    const response = this.selectBestResponse(enhancedIntent, conversationContext);

    // Add message to conversation history
    this.conversationManager.addMessage(userId, message, response, {
      intent: enhancedIntent.intent,
      confidence: enhancedIntent.confidence
    });

    return {
      message: response,
      intent: enhancedIntent.intent,
      confidence: enhancedIntent.confidence,
      contextual: conversationContext.hasHistory
    };
  }

  // Enhance intent analysis with conversation context
  enhanceIntentWithContext(intentAnalysis, context) {
    // If we have conversation history, boost confidence for consistent intents
    if (context.hasHistory) {
      const recentIntents = context.recentMessages
        .filter(msg => msg.type === 'bot' && msg.metadata.intent)
        .map(msg => msg.metadata.intent);

      if (recentIntents.includes(intentAnalysis.intent)) {
        intentAnalysis.confidence = Math.min(1.0, intentAnalysis.confidence * 1.2);
      }
    }

    return intentAnalysis;
  }

  // Select best response based on intent and context
  selectBestResponse(intentAnalysis, context) {
    const responses = intentAnalysis.data.responses;

    // Use conversation context to select more appropriate response
    if (context.hasHistory && context.recentMessages.length > 2) {
      const lastUserMessage = context.recentMessages
        .slice()
        .reverse()
        .find(msg => msg.type === 'user');

      if (lastUserMessage) {
        // Customize response based on conversation flow
        return this.customizeResponseForContext(responses[0], lastUserMessage.content, context);
      }
    }

    // Return random response from available options for variety
    return responses[Math.floor(Math.random() * responses.length)];
  }

  // Customize response based on conversation context
  customizeResponseForContext(baseResponse, lastMessage, context) {
    // Simple contextual customization
    if (lastMessage.includes('спасибо') || lastMessage.includes('благодарю')) {
      return 'Пожалуйста! Рад был помочь. Есть еще вопросы?';
    }

    if (lastMessage.includes('когда') || lastMessage.includes('время')) {
      return 'Мы работаем ежедневно с 9:00 до 19:00. Выберите удобное время для записи!';
    }

    if (lastMessage.includes('где') || lastMessage.includes('адрес')) {
      return 'г. Астана, Қобыз, 36. Точная локация доступна в 2ГИС с парковкой для клиентов.';
    }

    return baseResponse;
  }

  // Process learning commands
  processLearningCommand(message) {
    // Support multiple learning commands in one message
    const learnCommands = message.split('обучить:').slice(1);

    if (learnCommands.length > 0) {
      let responses = [];

      for (const command of learnCommands) {
        const learnMatch = command.trim().match(/^(.+?)\s*->\s*(.+)$/);
        if (learnMatch) {
          const question = learnMatch[1].trim();
          const answer = learnMatch[2].trim();

          // Create a unique intent name for this learned response
          const intentName = 'learned_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

          // Add new intent pattern
          this.intentAnalyzer.intentPatterns[intentName] = {
            patterns: [question.toLowerCase()],
            confidence: 0.95,
            responses: [answer]
          };

          responses.push(`"${question}" -> "${answer}"`);
        }
      }

      if (responses.length > 0) {
        return `✅ Обучен ${responses.length} командам!\n${responses.join('\n')}`;
      }
    }

    // Also support single command format
    const singleMatch = message.match(/обучить:\s*(.+?)\s*->\s*(.+)/i);
    if (singleMatch) {
      const question = singleMatch[1].trim();
      const answer = singleMatch[2].trim();

      // Create a unique intent name for this learned response
      const intentName = 'learned_' + Date.now();

      // Add new intent pattern
      this.intentAnalyzer.intentPatterns[intentName] = {
        patterns: [question.toLowerCase()],
        confidence: 0.95,
        responses: [answer]
      };

      return `✅ Обучен! Теперь на "${question}" я буду отвечать: "${answer}"`;
    }

    return 'Используйте формат: "обучить: [вопрос] -> [ответ]" чтобы научить меня.';
  }

  // Get learning statistics
  getStats() {
    const convStats = this.conversationManager.getStats();
    return {
      ...convStats,
      totalIntents: Object.keys(this.intentAnalyzer.intentPatterns).length,
      supportedIntents: Object.keys(this.intentAnalyzer.intentPatterns)
    };
  }
}

// Create advanced chatbot instance
const advancedChatbot = new ResponseGenerator();

// WebSocket connection
wss.on('connection', (ws) => {
  console.log('New client connected');

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      if (data.type === 'chat') {
        const userMessage = data.message;
        const userId = data.userId || 'anonymous_' + Date.now();

        // Generate response using advanced chatbot
        const result = advancedChatbot.generateResponse(userId, userMessage);

        // Process learning commands
        if (userMessage.toLowerCase().startsWith('обучить:')) {
          const learningResponse = advancedChatbot.processLearningCommand(userMessage);
          ws.send(JSON.stringify({
            type: 'chat_response',
            message: learningResponse,
            intent: 'learning',
            confidence: 1.0,
            contextual: false,
            timestamp: new Date().toISOString()
          }));
          return;
        }

        // Send response back
        ws.send(JSON.stringify({
          type: 'chat_response',
          message: result.message,
          intent: result.intent,
          confidence: result.confidence,
          contextual: result.contextual,
          timestamp: new Date().toISOString()
        }));
      }

      // Handle conversation context requests
      if (data.type === 'get_context') {
        const userId = data.userId || 'anonymous';
        const context = advancedChatbot.conversationManager.getContext(userId);
        ws.send(JSON.stringify({
          type: 'context',
          data: context,
          timestamp: new Date().toISOString()
        }));
      }

      // Handle chatbot statistics request
      if (data.type === 'get_stats') {
        const stats = advancedChatbot.getStats();
        ws.send(JSON.stringify({
          type: 'stats',
          data: stats,
          timestamp: new Date().toISOString()
        }));
      }
    } catch (error) {
      console.error('Error processing message:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Произошла ошибка при обработке сообщения',
        timestamp: new Date().toISOString()
      }));
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

// Start server
const PORT = process.env.PORT || 3003;
server.listen(PORT, () => {
  console.log(`🚀 Backend server running on port ${PORT}`);
  console.log(`📁 Serving files from: ${path.join(__dirname)}`);
  console.log(`🔗 Admin panel: http://localhost:${PORT}/login.html`);
  console.log(`🌐 Main site: http://localhost:${PORT}/index.html`);
  console.log(`🤖 Simple Chatbot: Ready to assist`);
});

module.exports = app;
