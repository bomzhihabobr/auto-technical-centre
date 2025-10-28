/* Main interactions for ATC landing */
(function(){
  const $ = (s, p=document) => p.querySelector(s);
  const $$ = (s, p=document) => Array.from(p.querySelectorAll(s));

  // i18n dictionary RU / KZ (kk)
  const i18n = {
    ru: {
      'nav.services': 'Услуги',
      'nav.required': 'Обязателен',
      'nav.steps': 'Шаги',
      'nav.benefits': 'Преимущества',
      'nav.prepare': 'Подготовка',
      'nav.extra': 'Доп. услуги',
      'nav.pricing': 'Прайс',
      'nav.testimonials': 'Отзывы',
      'nav.faq': 'FAQ',
      'nav.contacts': 'Контакты',
      'nav.book': 'Записаться',

      'hero.title': 'Специализированный центр техосмотра в Астане',
      'hero.lead': 'Официально, быстро и без очереди. Гарантированный результат за 17 минут.',
      'hero.cta': 'Записаться на ТО',
      'hero.call': 'Позвонить',
      'hero.badge.official': 'Официальный оператор ТО',
      'hero.badge.fast': 'Быстро — от 17 минут',
      'hero.badge.promo': 'Акция: каждому 10-му −50%, 20-му — бесплатно',

      'services.title': 'Что мы проверяем',
      'services.subtitle': 'Комплексная диагностика узлов и систем в соответствии с регламентом ТО.',

      'required.title': 'Техосмотр обязателен / не требуется',
      'required.subtitle': 'Информация подготовлена по действующим требованиям РК.',
      'required.must': 'ТЕХОСМОТР ОБЯЗАТЕЛЕН',
      'required.free': 'ТЕХОСМОТР НЕ ТРЕБУЕТСЯ',
      'required.items.1': 'Постановка на учет ТС старше 4 лет.',
      'required.items.2': 'Смена владельца ТС старше 4 лет.',
      'required.items.3': 'Изменение конструкции/замена основного компонента.',
      'required.items.4': 'Такси, автобусы и грузовые автомобили.',
      'free.items.1': 'Легковые авто, мото, прицепы до 3,5 т — до 4 лет включая год выпуска.',
      'free.items.2': 'Прицепы физ. лиц до 3,5 т — независимо от года выпуска.',
      'free.items.3': 'Личные легковые авто и мото, не используемые в коммерческих целях.',

      'steps.title': 'Процесс получения диагностической карты',
      'steps.subtitle': 'Всего 3 шага — прозрачно и удобно.',
      'steps.1.title': 'Запишитесь на ТО',
      'steps.1.text': 'Оставьте заявку на сайте или позвоните по телефону. Выбирайте удобную дату и время.',
      'steps.2.title': 'Предоставьте ТС для осмотра',
      'steps.2.text': 'Проведем техосмотр по регламенту в строго отведенное время. Без очереди.',
      'steps.3.title': 'Получите карту ТО',
      'steps.3.text': 'Выдаем документы и консультируем по возможному ремонту. Быстро и официально.',

      'benefits.title': 'Почему техосмотр нужно проходить у нас?',

      'prepare.title': 'Подготовьтесь к техосмотру',
      'prepare.car.title': 'Автомобиль',
      'prepare.car.text': 'Авто должно быть технически исправным по действующим нормам.',
      'prepare.pay.title': 'Оплата',
      'prepare.pay.text': 'Оплата по тарифу категории ТС. Доступны наличные и безнал.',
      'prepare.docs.title': 'Документы',
      'prepare.docs.text': 'Свидетельство о регистрации ТС/ПТС и документ, удостоверяющий личность.',

      'extra.title': 'Дополнительные услуги',
      'extra.subtitle': 'Оформление страховки ОСАГО, шиномонтаж, компьютерная диагностика — по запросу.',
      'extra.link': 'Оставить заявку',
      'extra.diagnostics': 'Диагностика',
      'extra.tire': 'Шиномонтаж',

      'pricing.title': 'Прайс на наши услуги',
      'pricing.subtitle': 'Стоимость зависит от категории транспортного средства и регламента осмотра. Оставьте заявку — подберем оптимальный тариф.',
      'pricing.note': 'Актуальные цены уточняйте у менеджера — действуют акции: каждому 10‑му −50%, 20‑му — бесплатно.',
      'cta.book': 'Записаться',
      'cta.askPrice': 'Уточнить цену',
      'cta.askList': 'Запросить прайс',

      'testimonials.title': 'Отзывы наших клиентов',
      'testimonials.subtitle': 'Нас рекомендуют за скорость, качество и внимательное отношение.',

      'faq.title': 'Часто задаваемые вопросы',
      'faq.q1': 'Для прохождения ТО какие требуются документы?',
      'faq.a1': 'Для прохождения ТО вам необходимо иметь при себе свидетельство регистрации ТС.',
      'faq.q2': 'Я не уплатил налог на транспорт за прошлый год, могу ли я пройти ТО?',
      'faq.a2': 'Да, для прохождения ТО оплата налога необязательна.',
      'faq.q3': 'У меня новая машина — нужен ли мне ТО?',
      'faq.a3': 'Автомобилям младше 7 лет включая год выпуска ТО необязателен (есть исключения для коммерческого транспорта).',
      'faq.q4': 'Нужно ли проходить ТО перед продажей авто?',
      'faq.a4': 'Если срок ТО не истек — повторно проходить не требуется.',
      'faq.q5': 'Проходить ли заново ТО на купленном авто?',
      'faq.a5': 'Не нужно. Обратитесь в ЦТО, где проверяли машину ранее, для переоформления свидетельства.',
      'faq.q6': 'Если мой автомобиль не пройдет ТО из‑за неисправности?',
      'faq.a6': 'Выдается ДК с перечнем неисправностей. В течение 10 дней можно устранить и пройти повторный осмотр по проблемным пунктам.',
      'faq.q7': 'Можно ли пройти техосмотр авто с российскими номерами в Казахстане?',
      'faq.a7': 'Да, можно.',

      'contacts.map.title': 'Карта проезда',
      'contacts.map.info': 'Нажмите на метку для подробной информации',

      'booking.title': 'Запись на техосмотр',
      'form.name': 'Имя',
      'form.name.ph': 'Ваше имя',
      'form.phone': 'Телефон',
      'form.phone.ph': '+7 ___ ___ __ __',
      'form.car': 'Марка и модель',
      'form.car.ph': 'Напр.: Toyota Camry',
      'form.date': 'Дата',
      'form.time': 'Время',
      'form.comment': 'Комментарий',
      'form.comment.ph': 'Удобно после 18:00, нужны консультации и т.п.',
      'form.submit': 'Отправить в WhatsApp',
      'form.call': 'Позвонить',
      'policy': 'Нажимая кнопку, вы соглашаетесь с обработкой персональных данных.',

      'msg.booking': 'Запись на техосмотр',
      'msg.name': 'Имя',
      'msg.phone': 'Телефон',
      'msg.car': 'Авто',
      'msg.desiredTime': 'Желаемое время',
      'msg.comment': 'Комментарий',
      'msg.sentFrom': 'Отправлено с сайта at-c.kz'
    },
    kk: {
      'nav.services': 'Қызметтер',
      'nav.required': 'Міндетті',
      'nav.steps': 'Қадамдар',
      'nav.benefits': 'Артықшылықтар',
      'nav.prepare': 'Дайындық',
      'nav.extra': 'Қосымша қызметтер',
      'nav.pricing': 'Бағалар',
      'nav.testimonials': 'Пікірлер',
      'nav.faq': 'Сұрақ-Жауап',
      'nav.contacts': 'Байланыс',
      'nav.book': 'Жазылу',

      'hero.title': 'Астанадағы техникалық байқау орталығы',
      'hero.lead': 'Ресми, тез және кезексіз. Нәтиже 17 минутта.',
      'hero.cta': 'ТО-ға жазылу',
      'hero.call': 'Қоңырау шалу',
      'hero.badge.official': 'Ресми ТО операторы',
      'hero.badge.fast': 'Тез — 17 минуттан бастап',
      'hero.badge.promo': 'Акция: әр 10-шы клиентке −50%, 20-шысы — тегін',

      'services.title': 'Нені тексереміз',
      'services.subtitle': 'ТО регламентіне сәйкес жүйелердің кешенді диагностикасы.',

      'required.title': 'Техбайқау міндетті / қажет емес',
      'required.subtitle': 'Ақпарат ҚР қолданыстағы талаптарына сай.',
      'required.must': 'ТЕХБАЙҚАУ МІНДЕТТІ',
      'required.free': 'ТЕХБАЙҚАУ ҚАЖЕТ ЕМЕС',
      'required.items.1': 'Шығарылғанына 4 жылдан асқан КҚ есепке қою.',
      'required.items.2': '4 жылдан асқан КҚ иесін ауыстыру.',
      'required.items.3': 'Құрылымды өзгерту/негізгі агрегатты ауыстыру.',
      'required.items.4': 'Такси, автобустар және жүк көліктері.',
      'free.items.1': 'Жеңіл авто, мото, тіркемелер 3,5 т дейін — 4 жылға дейін, шығарылған жылын қоса.',
      'free.items.2': 'Жеке тұлғалардың 3,5 т дейінгі тіркемелері — шығарылған жылына қарамастан.',
      'free.items.3': 'Коммерциялық емес мақсатта қолданылатын жеңіл авто мен мото.',

      'steps.title': 'Диагностикалық картаны алу үдерісі',
      'steps.subtitle': 'Барлығы 3 қадам — түсінікті және қолайлы.',
      'steps.1.title': 'ТО-ға жазылыңыз',
      'steps.1.text': 'Сайтта өтінім қалдырыңыз немесе телефон соғыңыз. Ыңғайлы күн мен уақытты таңдаңыз.',
      'steps.2.title': 'Көлікті тексеруге әкеліңіз',
      'steps.2.text': 'Бекітілген регламент бойынша белгіленген уақытта өтеміз. Кезексіз.',
      'steps.3.title': 'ТО картасын алыңыз',
      'steps.3.text': 'Құжаттарды береміз және жөндеу бойынша кеңес береміз. Тез және ресми.',

      'benefits.title': 'Неліктен бізде техбайқаудан өту керек?',

      'prepare.title': 'Техбайқауға дайындалыңыз',
      'prepare.car.title': 'Автокөлік',
      'prepare.car.text': 'Авто қолданыстағы нормаларға сай техникалық жарамды болуы керек.',
      'prepare.pay.title': 'Төлем',
      'prepare.pay.text': 'КҚ санаты тарифі бойынша. Қолма-қол және қолма-қолсыз қабылдаймыз.',
      'prepare.docs.title': 'Құжаттар',
      'prepare.docs.text': 'КҚ тіркеу куәлігі/Техпаспорт және жеке куәлік.',

      'extra.title': 'Қосымша қызметтер',
      'extra.subtitle': 'ОСАГО сақтандыруы, шиномонтаж, компьютерлік диагностика — сұрау бойынша.',
      'extra.link': 'Өтініш қалдыру',
      'extra.diagnostics': 'Диагностика',
      'extra.tire': 'Шиномонтаж',

      'pricing.title': 'Біздің қызмет бағалары',
      'pricing.subtitle': 'Баға КҚ санатына және тексеру регламентіне байланысты. Өтінім қалдырыңыз — лайықты тариф ұсынамыз.',
      'pricing.note': 'Нақты бағаларды менеджерден сұраңыз — акция бар: әр 10-шы клиентке −50%, 20-шысы — тегін.',
      'cta.book': 'Жазылу',
      'cta.askPrice': 'Бағаны нақтылау',
      'cta.askList': 'Прайсты сұрау',

      'testimonials.title': 'Клиент пікірлері',
      'testimonials.subtitle': 'Бізді жылдамдық, сапа және қамқорлық үшін ұсынады.',

      'faq.title': 'Жиі қойылатын сұрақтар',
      'faq.q1': 'ТО-дан өту үшін қандай құжаттар керек?',
      'faq.a1': 'ТО-дан өту үшін КҚ тіркеу куәлігі болуы қажет.',
      'faq.q2': 'Өткен жылдың көлік салығын төлемесем, ТО-дан өте аламын ба?',
      'faq.a2': 'Иә, ТО-дан өту үшін салықты төлеу міндетті емес.',
      'faq.q3': 'Жаңа көлікке ТО қажет пе?',
      'faq.a3': 'Шығарылғанына 7 жыл толмаған автоға ТО міндетті емес (коммерциялық көліктер — ерекшелік).',
      'faq.q4': 'Автокөлікті сатар алдында ТО қажет пе?',
      'faq.a4': 'Егер ТО мерзімі өтпеген болса — қайта өту қажет емес.',
      'faq.q5': 'Сатып алынған автоға қайтадан ТО өту керек пе?',
      'faq.a5': 'Қайта қажет емес. Бұрынғы ЦТО-ға жүгініп, куәлікті сіздің атыңызға рәсімдеңіз.',
      'faq.q6': 'Егер көлік ақауға байланысты ТО-дан өтпесе?',
      'faq.a6': 'Ақаулар тізімі бар ДК беріледі. 10 күн ішінде жойып, тек проблемалық пункттер бойынша қайта өтуге болады.',
      'faq.q7': 'Ресей нөмірлі автоны Қазақстанда техбайқаудан өткізе аламын ба?',
      'faq.a7': 'Иә, болады.',

      'contacts.map.title': 'Келу картасы',
      'contacts.map.info': 'Толық ақпарат алу үшін белгіні басыңыз',

      'booking.title': 'Техбайқауға жазылу',
      'form.name': 'Аты',
      'form.name.ph': 'Сіздің атыңыз',
      'form.phone': 'Телефон',
      'form.phone.ph': '+7 ___ ___ __ __',
      'form.car': 'Марка және модель',
      'form.car.ph': 'Мысалы: Toyota Camry',
      'form.date': 'Күні',
      'form.time': 'Уақыты',
      'form.comment': 'Пікір',
      'form.comment.ph': '18:00-ден кейін ыңғайлы, кеңес керек және т.б.',
      'form.submit': 'WhatsApp-қа жіберу',
      'form.call': 'Қоңырау шалу',
      'policy': 'Түймені басу арқылы сіз дербес деректерді өңдеуге келісесіз.',

      'msg.booking': 'Техбайқауға жазылу',
      'msg.name': 'Аты',
      'msg.phone': 'Телефон',
      'msg.car': 'Авто',
      'msg.desiredTime': 'Қалаған уақыт',
      'msg.comment': 'Пікір',
      'msg.sentFrom': 'at-c.kz сайтынан жіберілді'
    }
  };

  const getLang = () => localStorage.getItem('lang') || 'ru';
  const setLang = (lang) => {
    localStorage.setItem('lang', lang);
    document.documentElement.lang = lang === 'kk' ? 'kk' : 'ru';
  };
  const t = (key, fallback = '') => {
    const lang = getLang();
    return (i18n[lang] && i18n[lang][key]) || fallback || (i18n.ru[key] || '');
  };
  const applyLang = () => {
    const lang = getLang();
    // Text content
    $$('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (!key) return;
      el.textContent = t(key, el.textContent);
    });
    // Placeholders
    $$('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (!key) return;
      el.setAttribute('placeholder', t(key, el.getAttribute('placeholder') || ''));
    });
    // Toggle button label: show the next language code
    const btn = $('#langToggle');
    if (btn) {
      btn.textContent = lang === 'ru' ? 'KZ' : 'RU';
      btn.setAttribute('aria-label', lang === 'ru' ? 'Қазақ тіліне ауыстыру' : 'Переключить на русский');
    }
  };

  // AOS animations (with graceful fallback)
  function initAOS() {
    if (typeof AOS !== 'undefined') {
      document.addEventListener('DOMContentLoaded', () => {
        AOS.init({
          duration: 700,
          easing: 'ease-out-cubic',
          once: true,
          offset: 10,
          startEvent: 'DOMContentLoaded',
        });
        setTimeout(() => { try { AOS.refreshHard(); } catch(_){} }, 100);
      });
    } else {
      console.warn('AOS library not loaded, animations disabled');
      document.body.classList.add('no-aos');
    }
  }

  // Initialize AOS immediately
  initAOS();

  // Initialize language
  setLang(getLang());
  applyLang();
  // Remove no-js flag
  document.body.classList.remove('no-js');

  // Header scroll state
  const header = $('#header');
  const onScroll = () => {
    if (window.scrollY > 8) header.classList.add('scrolled');
    else header.classList.remove('scrolled');
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Burger menu
  const burger = $('#burger');
  if (burger) {
    burger.addEventListener('click', () => {
      header.classList.toggle('open');
    });
  }

  // Language toggle
  const langToggle = $('#langToggle');
  if (langToggle) {
    langToggle.addEventListener('click', () => {
      const next = getLang() === 'ru' ? 'kk' : 'ru';
      setLang(next);
      applyLang();
    });
  }

  // Close menu on link click and smooth scroll
  $$('.menu a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      const target = $(id);
      if (target) {
        e.preventDefault();
        header.classList.remove('open');
        const top = target.getBoundingClientRect().top + window.scrollY - 66;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });

  // Year in footer
  const y = $('#year');
  if (y) y.textContent = new Date().getFullYear();

  // Call button
  const callBtn = $('#callBtn');
  if (callBtn) {
    callBtn.addEventListener('click', () => {
      window.location.href = 'tel:+77002433010';
    });
  }

  // Simple KZ phone input formatter
  const phoneInput = $('#phone');
  if (phoneInput) {
    const formatKZ = (v) => {
      const d = v.replace(/\D/g, '');
      let out = '+7 ';
      let i = d.startsWith('7') ? 1 : (d.startsWith('8') ? 1 : 0);
      if (d.length <= i) return out.trim();
      if (d.length > i) out += d.slice(i, i+3);
      if (d.length > i+3) out += ' ' + d.slice(i+3, i+6);
      if (d.length > i+6) out += ' ' + d.slice(i+6, i+8);
      if (d.length > i+8) out += ' ' + d.slice(i+8, i+10);
      return out.trim();
    };
    phoneInput.addEventListener('input', () => {
      const pos = phoneInput.selectionStart;
      phoneInput.value = formatKZ(phoneInput.value);
      phoneInput.setSelectionRange(phoneInput.value.length, phoneInput.value.length);
    });
    phoneInput.addEventListener('focus', () => {
      if (!phoneInput.value) phoneInput.value = '+7 ';
    });
  }

  // Booking form -> WhatsApp
  const form = $('#bookingForm');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = $('#name')?.value?.trim() || '';
      const phone = $('#phone')?.value?.trim() || '';
      const car = $('#car')?.value?.trim() || '';
      const date = $('#date')?.value || '';
      const time = $('#time')?.value || '';
      const comment = $('#comment')?.value?.trim() || '';

      const lines = [
        t('msg.booking', 'Запись на техосмотр'),
        `${t('msg.name', 'Имя')}: ${name}`,
        `${t('msg.phone', 'Телефон')}: ${phone}`,
        car ? `${t('msg.car', 'Авто')}: ${car}` : null,
        (date || time) ? `${t('msg.desiredTime', 'Желаемое время')}: ${date || ''} ${time || ''}` : null,
        comment ? `${t('msg.comment', 'Комментарий')}: ${comment}` : null,
        '',
        t('msg.sentFrom', 'Отправлено с сайта at-c.kz')
      ].filter(Boolean);

      const text = encodeURIComponent(lines.join('\n'));
      const wa = `https://wa.me/77002433010?text=${text}`;
      window.open(wa, '_blank');
    });
  }

  // Initialize Leaflet map (free, no API key required)
  const initMap = () => {
    if (typeof L !== 'undefined' && $('#dgMap')) {
      try {
        // Initialize the map
        const map = L.map('dgMap', {
          center: [51.13630235746184, 71.5208673477173],
          zoom: 16,
          zoomControl: true
        });

        // Add OpenStreetMap tiles (free)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19
        }).addTo(map);

        // Custom marker icon
        const customIcon = L.divIcon({
          className: 'custom-marker',
          html: '<div style="background: #ff7a00; color: white; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"><i class="fas fa-map-marker-alt" style="font-size: 20px;"></i></div>',
          iconSize: [40, 40],
          iconAnchor: [20, 40]
        });

        // Add marker with popup
        const marker = L.marker([51.13630235746184, 71.5208673477173], { icon: customIcon }).addTo(map);
        marker.bindPopup(`
          <div style="text-align: center; font-family: Inter, sans-serif;">
            <h3 style="margin: 0 0 8px; color: #ff7a00;">Auto Technical Centre</h3>
            <p style="margin: 0; color: #666; font-size: 14px;">Техосмотр автомобилей</p>
            <p style="margin: 8px 0; color: #333;"><strong>📍 Адрес:</strong> г. Астана, Қобыз, 36</p>
            <p style="margin: 8px 0; color: #333;"><strong>📞 Телефоны:</strong><br>+7 700 243 30 10<br>+7 776 848 27 44</p>
          </div>
        `);

        // Make map responsive
        const resizeMap = () => {
          setTimeout(() => {
            map.invalidateSize();
          }, 100);
        };

        window.addEventListener('resize', resizeMap);
        resizeMap();

        console.log('✅ Leaflet map initialized successfully');
      } catch (error) {
        console.error('Error initializing Leaflet map:', error);
        showMapFallback();
      }
    } else {
      // Retry if Leaflet is not loaded yet
      const retryCount = arguments[1] || 0;
      if (retryCount < 5) {
        setTimeout(() => initMap(retryCount + 1), 1000);
      } else {
        console.warn('Leaflet failed to load after 5 attempts, showing fallback');
        showMapFallback();
      }
    }
  };

  // Start trying to initialize map
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMap);
  } else {
    initMap();
  }
})();
