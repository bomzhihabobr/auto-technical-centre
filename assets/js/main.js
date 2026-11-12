/* Main interactions for ATC landing */
(function(){
  const $ = (s, p=document) => p.querySelector(s);
  const $$ = (s, p=document) => Array.from(p.querySelectorAll(s));
  const localHost = ['localhost','127.0.0.1','::1',''].includes(window.location.hostname);
  const API_ROOT = localHost && window.location.port !== '3003' ? `http://${window.location.hostname === '127.0.0.1' ? '127.0.0.1' : 'localhost'}:3003` : '';
  const apiFetch = (path, options) => fetch(`${API_ROOT}/api/${String(path).replace(/^\/+/, '')}`, options);

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

      'hero.title': 'Техосмотр без лишнего ожидания',
      'hero.lead': 'Проверим автомобиль по требованиям и подскажем, что подготовить. Выберите свободное время онлайн — обычно осмотр занимает около 17 минут.',
      'hero.kicker': 'ОФИЦИАЛЬНЫЙ ЦЕНТР · АСТАНА',
      'hero.visual.status': 'ЦЕНТР ПРИНИМАЕТ ЗАПИСИ',
      'hero.visual.timeLabel': 'ОСМОТР ОТ',
      'hero.visual.minutes': 'МИНУТ',
      'hero.visual.official': 'ПО РЕГЛАМЕНТУ',
      'hero.visual.result': 'Понятный результат',
      'hero.proof.location': 'Астана · Қобыз, 36',
      'hero.proof.process': '3 простых шага',
      'hero.proof.booking': 'Свободное время онлайн',
      'hero.cta': 'Записаться на ТО',
      'hero.call': 'Позвонить',
      'hero.badge.official': 'Официальный оператор ТО',
      'hero.badge.fast': 'Быстро — от 17 минут',
      'theme.toDark': 'Включить тёмную тему',
      'theme.toLight': 'Включить светлую тему',

      'services.title': 'Что мы проверяем',
      'services.subtitle': 'Комплексная диагностика узлов и систем в соответствии с регламентом ТО.',

      'required.title': 'Техосмотр обязателен / не требуется',
      'required.subtitle': 'Информация подготовлена по действующим требованиям РК.',
      'required.must': 'ТЕХОСМОТР ОБЯЗАТЕЛЕН',
      'required.free': 'ТЕХОСМОТР НЕ ТРЕБУЕТСЯ',
      'required.items.1': 'Постановка на учет ТС старше 7 лет.',
      'required.items.2': 'Смена владельца ТС старше 7 лет.',
      'required.items.3': 'Изменение конструкции/замена основного компонента.',
      'required.items.4': 'Такси, автобусы и грузовые автомобили.',
      'free.items.1': 'Легковые автомобили категории M1 до 7 лет включительно, если не используются для предпринимательских перевозок.',
      'free.items.2': 'Для коммерческих автомобилей и других категорий исключение по возрасту не применяется.',
      'free.items.3': 'Если категория или срок неочевидны, уточните необходимость ТО у менеджера.',

      'steps.title': 'Процесс получения диагностической карты',
      'steps.subtitle': 'Всего 3 шага — прозрачно и удобно.',
      'steps.1.title': 'Запишитесь на ТО',
      'steps.1.text': 'Оставьте заявку на сайте или позвоните по телефону. Выбирайте удобную дату и время.',
      'steps.2.title': 'Предоставьте ТС для осмотра',
      'steps.2.text': 'Проведем техосмотр по регламенту в строго отведенное время. Без очереди.',
      'steps.3.title': 'Получите карту ТО',
      'steps.3.text': 'Выдаем документы и консультируем по возможному ремонту. Быстро и официально.',

      'benefits.title': 'Почему техосмотр нужно проходить у нас?',

      'prepare.title': 'Что взять на техосмотр',
      'prepare.subtitle': 'Базовый комплект документов одинаковый: привезите транспортное средство и свидетельство о его регистрации.',
      'prepare.passenger.title': 'Легковой автомобиль',
      'prepare.commercial.title': 'Грузовой автомобиль или автобус',
      'prepare.other.title': 'Мотоцикл или прицеп',
      'prepare.vehicle.item': 'Транспортное средство для осмотра',
      'prepare.registration.item': 'Свидетельство о государственной регистрации ТС',
      'prepare.registration.unit': 'Регистрационный документ именно на это ТС',
      'prepare.car.title': 'Автомобиль',
      'prepare.car.text': 'Авто должно быть технически исправным по действующим нормам.',
      'prepare.pay.title': 'Оплата',
      'prepare.pay.text': 'Оплата по тарифу категории ТС. Доступны наличные и безнал.',
      'prepare.docs.title': 'Документы',
      'prepare.docs.text': 'Свидетельство о регистрации ТС/ПТС и документ, удостоверяющий личность.',

      'extra.title': 'Дополнительные услуги',
      'extra.subtitle': 'Помогаем с автострахованием и компьютерной диагностикой — проконсультируем по услуге до записи.',
      'extra.link': 'Уточнить условия',
      'extra.insurance': 'ОГПО ВТС (автострахование)',
      'extra.insurance.text': 'Помогаем оформить обязательный страховой полис для автомобиля и подскажем, какие данные понадобятся.',
      'extra.diagnostics': 'Компьютерная диагностика',
      'extra.diagnostics.text': 'Проверим электронные системы автомобиля и объясним результаты понятным языком.',

      'pricing.title': 'Прайс на наши услуги',
      'pricing.subtitle': 'Стоимость зависит от категории транспортного средства и регламента осмотра. Оставьте заявку — подберем оптимальный тариф.',
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
      'faq.a3': 'Легковым автомобилям категории M1 возрастом до 7 лет включительно, не используемым для предпринимательских перевозок, ТО не требуется.',
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
      'contacts.headline': 'Приезжайте — мы рядом',
      'contacts.subtitle': 'Ответим на вопросы и подберём удобное время для техосмотра.',
      'contacts.kicker': 'Свяжитесь с нами',
      'contacts.address.label': 'Адрес',
      'contacts.phone.label': 'Позвоните нам',
      'contacts.phone2.label': 'Дополнительный номер',
      'contacts.email.label': 'Электронная почта',
      'contacts.hours.label': 'Время работы',
      'contacts.map.kicker': 'Ждём вас в гости',
      'contacts.map.open': 'Открыть адрес в 2ГИС',
      'contacts.note': 'Точная локация доступна в 2ГИС. Парковка для клиентов.',

      'booking.title': 'Запись на техосмотр',
      'booking.kicker': 'Всего пара минут',
      'booking.intro': 'Оставьте контакты — мы подтвердим удобное время.',
      'form.name': 'Имя',
      'form.name.ph': 'Ваше имя',
      'form.phone': 'Телефон',
      'form.phone.ph': '+7 (___) ___-__-__',
      'form.car': 'Марка и модель',
      'form.car.ph': 'Напр.: Toyota Camry',
      'form.vehicleType': 'Тип транспорта',
      'form.vehicleType.choose': 'Выберите тип',
      'form.vehicleType.passenger': 'Легковой автомобиль',
      'form.vehicleType.commercial': 'Грузовой автомобиль',
      'form.vehicleType.bus': 'Автобус',
      'form.vehicleType.motorcycle': 'Мотоцикл',
      'form.vehicleType.trailer': 'Прицеп',
      'form.service': 'Услуга',
      'form.service.choose': 'Выберите услугу',
      'form.service.inspection': 'Технический осмотр',
      'form.service.diagnostics': 'Диагностика',
      'form.service.insurance': 'ОСАГО',
      'form.service.tire': 'Шиномонтаж',
      'form.date': 'Дата',
      'form.date.ph': 'ДД.ММ.ГГГГ',
      'form.date.aria': 'Дата записи',
      'form.date.pick': 'Выбрать дату',
      'form.date.hint': 'Выберите дату в календаре',
      'form.phone.hint': 'Формат: +7 (700) 123-45-67',
      'form.phone.invalid': 'Введите номер полностью',
      'form.date.required': 'Выберите дату',
      'form.submit.error': 'Не удалось отправить заявку. Позвоните нам: 8 707 243 3010.',
      'form.submit.connection': 'Не удалось связаться с сервером. Попробуйте ещё раз или позвоните: 8 707 243 3010.',
      'form.success.title': 'Заявка отправлена',
      'form.success.body': 'Мы скоро свяжемся с вами для подтверждения. Номер заявки:',
      'form.success.new': 'Записать ещё один автомобиль',
      'form.time.selectDate': 'Сначала выберите дату',
      'form.time.loading': 'Загружаем свободное время…',
      'form.time.none': 'На эту дату свободного времени нет',
      'form.time.loadError': 'Не удалось загрузить время. Попробуйте выбрать дату ещё раз.',
      'form.time.hint': 'Покажем свободное время после выбора даты',
      'form.time.selectSlot': 'Выберите время',
      'form.time.available': 'Свободных вариантов',
      'form.submit.sending': 'Отправляем…',
      'form.time': 'Время',
      'form.comment': 'Комментарий',
      'form.comment.ph': 'Удобно после 18:00, нужны консультации и т.п.',
      'form.submit': 'Отправить заявку',
      'form.call': 'Позвонить',
      'policy': 'Я согласен(на) на обработку данных для оформления записи.',
      'policy.link': 'Политика обработки данных',

      'msg.booking': 'Запись на техосмотр',
      'msg.name': 'Имя',
      'msg.phone': 'Телефон',
      'msg.car': 'Авто',
      'msg.desiredTime': 'Желаемое время',
      'msg.comment': 'Комментарий',
      'msg.sentFrom': 'Отправлено с сайта at-c.kz',
      'footer.description': 'Профессиональный техосмотр в Астане. Быстро, удобно, по правилам.',
      'footer.faq': 'Вопросы и ответы',
      'footer.privacy': 'Политика обработки данных',
      'footer.top': 'Наверх ↑',
      'privacy.eyebrow': 'AUTO TECHNICAL CENTRE · АСТАНА',
      'privacy.title': 'Политика обработки данных',
      'privacy.intro': 'Здесь описано, какие данные нужны для записи на техосмотр, зачем они используются и как связаться с центром по вопросам обработки данных.',
      'privacy.operator.title': 'Кто обрабатывает данные',
      'privacy.operator.text': 'Заявки обрабатывает Auto Technical Centre. Для связи по вопросам записи и обработки данных используйте телефон или электронную почту ниже.',
      'privacy.data.title': 'Какие данные мы получаем',
      'privacy.data.text': 'При отправке заявки сайт получает имя, номер телефона, марку и модель автомобиля, тип транспорта, выбранную услугу, желаемые дату и время, а также комментарий, если вы его добавили.',
      'privacy.purpose.title': 'Для чего нужны данные',
      'privacy.purpose.text': 'Данные используются для регистрации и обработки записи, проверки доступности времени, связи с вами для подтверждения и ведения внутреннего учета заявок. Данные из формы не публикуются на сайте.',
      'privacy.access.title': 'Доступ и хранение',
      'privacy.access.text': 'Заявки хранятся в базе данных сайта и доступны сотрудникам, которым они нужны для обработки записи. Данные следует хранить только столько, сколько необходимо для этих целей и выполнения применимых требований законодательства.',
      'privacy.rights.title': 'Ваши запросы',
      'privacy.rights.text': 'Вы можете обратиться, чтобы уточнить, исправить или удалить данные, а также отозвать согласие, если это допускается применимым законодательством. Укажите номер заявки и удобный способ обратной связи.',
      'privacy.note': 'Правила сбора и обработки данных регулируются законодательством Республики Казахстан. Перед публикацией владелец сайта должен проверить полное юридическое наименование оператора и актуальность этого текста.',
      'privacy.law': 'Закон РК «О персональных данных и их защите»',
      'privacy.back': 'Вернуться на сайт',
      'contacts.address': 'г. Астана, Қобыз, 36',
      'contacts.hours.value': 'Ежедневно с 09:00 до 19:00',
      'pricing.passenger.title': 'Легковые / Мото',
      'pricing.passenger.badge': 'Категории A, B',
      'pricing.passenger.item1': 'Полная диагностика по регламенту',
      'pricing.passenger.item2': 'Выдача диагностической карты',
      'pricing.passenger.item3': 'Консультация по результатам',
      'pricing.commercial.title': 'Коммерческий транспорт',
      'pricing.commercial.badge': 'Такси, автобусы, грузовые',
      'pricing.commercial.item1': 'Осмотр по требованиям для юрлиц',
      'pricing.commercial.item2': 'Закрывающие документы',
      'pricing.commercial.item3': 'Приоритетная запись',
      'pricing.special.title': 'Специальные категории',
      'pricing.special.badge': 'C1, D1, E и др.',
      'pricing.special.item1': 'Индивидуальные условия',
      'pricing.special.item2': 'Осмотр с учетом модификаций',
      'pricing.special.item3': 'Сопровождение по вопросам ТО',
      'testimonials.review1': 'Обслуживаюсь в данной компании довольно таки давно, персонал хорошо и четко знает свою работу. Ребята молодцы, всё делают быстро и качественно.',
      'testimonials.author1': '— Клиент ATC',
      'testimonials.review2': 'В Auto Technical Centre я прохожу техосмотр уже три года. Внимательное отношение и слаженные действия — всё без проволочек и бюрократии.',
      'testimonials.author2': '— Постоянный клиент',
      'testimonials.review3': 'Сервис нравится, отношение к клиентам доброжелательное. Прохождение ТО заняло совсем немного времени, спасибо!',
      'testimonials.author3': '— Владелец авто',
      'services.steering.title': 'Рулевое управление',
      'services.steering.item1': 'Люфт рулевого колеса (до 5° для легковых)',
      'services.steering.item2': 'Состояние рулевых тяг и наконечников',
      'services.steering.item3': 'Плавность вращения руля (без рывков)',
      'services.wheels.title': 'Колеса, шины, подвеска',
      'services.wheels.item1': 'Состояние шаровых опор и их люфт',
      'services.wheels.item2': 'Крепления и износ шин',
      'services.wheels.item3': 'Крепление кардана (для заднеприводных)',
      'services.chassis.title': 'Шасси и агрегаты',
      'services.chassis.item1': 'Крепления узлов и агрегатов',
      'services.chassis.item2': 'Отсутствие подтеков и повреждений',
      'services.chassis.item3': 'Состояние двигателя и систем',
      'services.equipment.title': 'Прочее оборудование',
      'services.equipment.item1': 'Огнетушитель, аптечка, знак аварийной остановки',
      'services.equipment.item2': 'Зеркала, стекла, стеклоочистители',
      'services.equipment.item3': 'Ремни безопасности, звуковой сигнал',
      'services.brakes.title': 'Тормозная система',
      'services.brakes.item1': 'Удельная тормозная сила, равномерность',
      'services.brakes.item2': 'Герметичность шлангов и приводов',
      'services.brakes.item3': 'Срабатывание сигнализации привода',
      'services.visibility.title': 'Обзорность и свет',
      'services.visibility.item1': 'Светопропускание стекол по нормам',
      'services.visibility.item2': 'Направление пучка, сила света фар',
      'services.visibility.item3': 'Режимы работы и сигнализация',
      'benefits.reliability.title': 'Надежность',
      'benefits.reliability.text': 'Без посредников. Честные цены и прозрачный процесс.',
      'benefits.official.title': 'Официально',
      'benefits.official.text': 'Аккредитованный оператор ТО. Спецоборудование по стандартам.',
      'benefits.speed.title': 'Скорость',
      'benefits.speed.text': 'Работаем быстро, качественно и в срок — от 17 минут.',
      'benefits.orgs.title': 'Для организаций',
      'benefits.orgs.text': 'Сотрудничаем с юрлицами. Закрывающие документы.',
      'benefits.value.title': 'Выгода',
      'benefits.value.text': 'Оптимальные цены и акции для постоянных клиентов.',
      'benefits.guarantee.title': 'Гарантии',
      'benefits.guarantee.text': 'Выдача всех необходимых документов и консультация.',
      'benefits.queue.title': 'Без очереди',
      'benefits.queue.text': 'Онлайн-запись экономит ваше время.',
      'contacts.title': 'Контакты',
      'contacts.whatsapp': 'Написать в WhatsApp',
      'header.home.aria': 'На главную — Auto Technical Centre',
      'footer.home.aria': 'На главную',
      'footer.links.aria': 'Ссылки в подвале',
      'brand.tagline': 'ЦЕНТР ТЕХОСМОТРА'
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

      'hero.title': 'Техбайқаудан кезексіз өтіңіз',
      'hero.lead': 'Көлікті талаптарға сай тексеріп, алдын ала не дайындау керегін түсіндіреміз. Бос уақытты онлайн таңдап, жазылыңыз.',
      'hero.kicker': 'РЕСМИ ОРТАЛЫҚ · АСТАНА',
      'hero.visual.status': 'ОРТАЛЫҚ ЖАЗЫЛЫМ ҚАБЫЛДАЙДЫ',
      'hero.visual.timeLabel': 'ТЕКСЕРУ УАҚЫТЫ',
      'hero.visual.minutes': 'МИНУТТАН',
      'hero.visual.official': 'РЕГЛАМЕНТ БОЙЫНША',
      'hero.visual.result': 'Түсінікті нәтиже',
      'hero.proof.location': 'Астана · Қобыз, 36',
      'hero.proof.process': '3 қарапайым қадам',
      'hero.proof.booking': 'Бос уақытты онлайн таңдаңыз',
      'hero.cta': 'ТО-ға жазылу',
      'hero.call': 'Қоңырау шалу',
      'hero.badge.official': 'Ресми ТО операторы',
      'hero.badge.fast': 'Тез — 17 минуттан бастап',
      'theme.toDark': 'Қараңғы тақырыпты қосу',
      'theme.toLight': 'Ашық тақырыпты қосу',

      'services.title': 'Нені тексереміз',
      'services.subtitle': 'ТО регламентіне сәйкес жүйелердің кешенді диагностикасы.',
      'services.steering.title': 'Рульдік басқару',
      'services.steering.item1': 'Руль дөңгелегінің бос жүрісі (жеңіл көлік үшін 5°-қа дейін)',
      'services.steering.item2': 'Руль тартқыштары мен ұштарының күйі',
      'services.steering.item3': 'Рульдің бірқалыпты айналуы (жұлқусыз)',
      'services.wheels.title': 'Дөңгелектер, шиналар және аспа',
      'services.wheels.item1': 'Шарлы тіректердің күйі және бос жүрісі',
      'services.wheels.item2': 'Шиналардың бекітілуі мен тозуы',
      'services.wheels.item3': 'Карданның бекітілуі (артқы жетекті көліктерде)',
      'services.chassis.title': 'Шасси және агрегаттар',
      'services.chassis.item1': 'Тораптар мен агрегаттардың бекітілуі',
      'services.chassis.item2': 'Сұйықтық ағуы мен зақымдардың болмауы',
      'services.chassis.item3': 'Қозғалтқыш пен жүйелердің күйі',
      'services.equipment.title': 'Қосымша жабдықтар',
      'services.equipment.item1': 'Өрт сөндіргіш, дәрі қобдишасы, апаттық тоқтау белгісі',
      'services.equipment.item2': 'Айналар, әйнектер және әйнек тазалағыштар',
      'services.equipment.item3': 'Қауіпсіздік белдіктері мен дыбыстық сигнал',
      'services.brakes.title': 'Тежеу жүйесі',
      'services.brakes.item1': 'Тежеу күші және біркелкілігі',
      'services.brakes.item2': 'Шлангілер мен жетектердің герметикалығы',
      'services.brakes.item3': 'Жетек дабылының іске қосылуы',
      'services.visibility.title': 'Көріну және жарық',
      'services.visibility.item1': 'Әйнектердің жарық өткізуі нормаларға сай',
      'services.visibility.item2': 'Фара шоғының бағыты мен жарық күші',
      'services.visibility.item3': 'Жұмыс режимдері мен сигнализация',

      'required.title': 'Техбайқау міндетті / қажет емес',
      'required.subtitle': 'Ақпарат ҚР қолданыстағы талаптарына сай.',
      'required.must': 'ТЕХБАЙҚАУ МІНДЕТТІ',
      'required.free': 'ТЕХБАЙҚАУ ҚАЖЕТ ЕМЕС',
      'required.items.1': 'Шығарылғанына 7 жылдан асқан КҚ есепке қою.',
      'required.items.2': '7 жылдан асқан КҚ иесін ауыстыру.',
      'required.items.3': 'Құрылымды өзгерту/негізгі агрегатты ауыстыру.',
      'required.items.4': 'Такси, автобустар және жүк көліктері.',
      'free.items.1': 'Кәсіпкерлік тасымалдауда пайдаланылмайтын, жасы шығарылған жылын қоса алғанда 7 жылға дейінгі M1 санатындағы жеңіл көліктер.',
      'free.items.2': 'Коммерциялық көліктер мен басқа санаттарға жасына байланысты ерекшелік қолданылмайды.',
      'free.items.3': 'Санаты немесе мерзімі түсініксіз болса, ТО қажеттілігін менеджерден нақтылаңыз.',

      'steps.title': 'Диагностикалық картаны алу үдерісі',
      'steps.subtitle': 'Барлығы 3 қадам — түсінікті және қолайлы.',
      'steps.1.title': 'ТО-ға жазылыңыз',
      'steps.1.text': 'Сайтта өтінім қалдырыңыз немесе телефон соғыңыз. Ыңғайлы күн мен уақытты таңдаңыз.',
      'steps.2.title': 'Көлікті тексеруге әкеліңіз',
      'steps.2.text': 'Бекітілген регламент бойынша белгіленген уақытта өтеміз. Кезексіз.',
      'steps.3.title': 'ТО картасын алыңыз',
      'steps.3.text': 'Құжаттарды береміз және жөндеу бойынша кеңес береміз. Тез және ресми.',

      'benefits.title': 'Неліктен бізде техбайқаудан өту керек?',
      'benefits.reliability.title': 'Сенімділік',
      'benefits.reliability.text': 'Делдалсыз жұмыс. Әділ баға және ашық үдеріс.',
      'benefits.official.title': 'Ресми қызмет',
      'benefits.official.text': 'Аккредиттелген ТО операторы. Стандартқа сай арнайы жабдық.',
      'benefits.speed.title': 'Жылдамдық',
      'benefits.speed.text': 'Жылдам әрі сапалы қызмет — 17 минуттан бастап.',
      'benefits.orgs.title': 'Ұйымдарға',
      'benefits.orgs.text': 'Заңды тұлғалармен жұмыс істейміз. Қажетті құжаттарды береміз.',
      'benefits.value.title': 'Тиімділік',
      'benefits.value.text': 'Тұрақты клиенттерге тиімді баға мен жеңілдіктер.',
      'benefits.guarantee.title': 'Кепілдік',
      'benefits.guarantee.text': 'Қажетті құжаттар мен кеңес беріледі.',
      'benefits.queue.title': 'Кезексіз',
      'benefits.queue.text': 'Онлайн жазылу уақытыңызды үнемдейді.',

      'prepare.title': 'Техбайқауға не әкелу керек',
      'prepare.subtitle': 'Құжаттардың негізгі тізімі бірдей: көлікті және оның тіркеу куәлігін алып келіңіз.',
      'prepare.passenger.title': 'Жеңіл көлік',
      'prepare.commercial.title': 'Жүк көлігі немесе автобус',
      'prepare.other.title': 'Мотоцикл немесе тіркеме',
      'prepare.vehicle.item': 'Тексеруге арналған көлік құралы',
      'prepare.registration.item': 'Көлік құралын мемлекеттік тіркеу туралы куәлік',
      'prepare.registration.unit': 'Дәл осы көлік құралына берілген тіркеу құжаты',
      'prepare.car.title': 'Автокөлік',
      'prepare.car.text': 'Авто қолданыстағы нормаларға сай техникалық жарамды болуы керек.',
      'prepare.pay.title': 'Төлем',
      'prepare.pay.text': 'КҚ санаты тарифі бойынша. Қолма-қол және қолма-қолсыз қабылдаймыз.',
      'prepare.docs.title': 'Құжаттар',
      'prepare.docs.text': 'КҚ тіркеу куәлігі/Техпаспорт және жеке куәлік.',

      'extra.title': 'Қосымша қызметтер',
      'extra.subtitle': 'Автосақтандыру және компьютерлік диагностика бойынша кеңес береміз.',
      'extra.link': 'Шарттарын нақтылау',
      'extra.insurance': 'КҚ ИАЖМС (автосақтандыру)',
      'extra.insurance.text': 'Көлікке міндетті сақтандыру полисін рәсімдеуге көмектесіп, қажетті деректерді түсіндіреміз.',
      'extra.diagnostics': 'Компьютерлік диагностика',
      'extra.diagnostics.text': 'Көліктің электрондық жүйелерін тексеріп, нәтижесін түсінікті тілмен айтамыз.',

      'pricing.title': 'Біздің қызмет бағалары',
      'pricing.subtitle': 'Баға КҚ санатына және тексеру регламентіне байланысты. Өтінім қалдырыңыз — лайықты тариф ұсынамыз.',
      'cta.book': 'Жазылу',
      'cta.askPrice': 'Бағаны нақтылау',
      'cta.askList': 'Прайсты сұрау',

      'testimonials.title': 'Клиент пікірлері',
      'testimonials.subtitle': 'Бізді жылдамдық, сапа және қамқорлық үшін ұсынады.',
      'pricing.passenger.title': 'Жеңіл көлік / мотоцикл',
      'pricing.passenger.badge': 'A, B санаттары',
      'pricing.passenger.item1': 'Регламент бойынша толық диагностика',
      'pricing.passenger.item2': 'Диагностикалық карта беру',
      'pricing.passenger.item3': 'Нәтижесі бойынша кеңес',
      'pricing.commercial.title': 'Коммерциялық көлік',
      'pricing.commercial.badge': 'Такси, автобус, жүк көлігі',
      'pricing.commercial.item1': 'Заңды тұлғалар талаптарына сай тексеру',
      'pricing.commercial.item2': 'Қажетті құжаттарды рәсімдеу',
      'pricing.commercial.item3': 'Кезектен тыс жазылу',
      'pricing.special.title': 'Арнайы санаттар',
      'pricing.special.badge': 'C1, D1, E және т.б.',
      'pricing.special.item1': 'Жеке шарттар',
      'pricing.special.item2': 'Өзгертілген көлікті тексеру',
      'pricing.special.item3': 'ТО мәселелері бойынша қолдау',
      'testimonials.review1': 'Бұл компанияның қызметін көптен бері пайдаланамын. Қызметкерлер өз ісін жақсы біледі, бәрін жылдам әрі сапалы орындайды.',
      'testimonials.author1': '— ATC клиенті',
      'testimonials.review2': 'Auto Technical Centre-де үш жылдан бері техбайқаудан өтемін. Қызмет мұқият көрсетіледі, бәрі кідіріссіз және артық әуре-сарсаңсыз өтеді.',
      'testimonials.author2': '— Тұрақты клиент',
      'testimonials.review3': 'Қызмет ұнайды, мамандар клиенттерге жақсы қарайды. ТО аз уақытта аяқталды, рақмет!',
      'testimonials.author3': '— Көлік иесі',

      'faq.title': 'Жиі қойылатын сұрақтар',
      'faq.q1': 'ТО-дан өту үшін қандай құжаттар керек?',
      'faq.a1': 'ТО-дан өту үшін КҚ тіркеу куәлігі болуы қажет.',
      'faq.q2': 'Өткен жылдың көлік салығын төлемесем, ТО-дан өте аламын ба?',
      'faq.a2': 'Иә, ТО-дан өту үшін салықты төлеу міндетті емес.',
      'faq.q3': 'Жаңа көлікке ТО қажет пе?',
      'faq.a3': 'Кәсіпкерлік тасымалдауда пайдаланылмайтын, жасы 7 жылдан аспайтын M1 санатындағы жеңіл көлікке ТО қажет емес.',
      'faq.q4': 'Автокөлікті сатар алдында ТО қажет пе?',
      'faq.a4': 'Егер ТО мерзімі өтпеген болса — қайта өту қажет емес.',
      'faq.q5': 'Сатып алынған автоға қайтадан ТО өту керек пе?',
      'faq.a5': 'Қайта қажет емес. Бұрынғы ЦТО-ға жүгініп, куәлікті сіздің атыңызға рәсімдеңіз.',
      'faq.q6': 'Егер көлік ақауға байланысты ТО-дан өтпесе?',
      'faq.a6': 'Ақаулар тізімі бар ДК беріледі. 10 күн ішінде жойып, тек проблемалық пункттер бойынша қайта өтуге болады.',
      'faq.q7': 'Ресей нөмірлі автоны Қазақстанда техбайқаудан өткізе аламын ба?',
      'faq.a7': 'Иә, болады.',

      'contacts.title': 'Байланыс деректері',
      'contacts.hours.value': 'Күн сайын 09:00-ден 19:00-ге дейін',
      'contacts.address': 'Астана қ., Қобыз көшесі, 36',
      'contacts.whatsapp': 'WhatsApp-қа жазу',
      'contacts.map.title': 'Келу картасы',
      'contacts.map.info': 'Толық ақпарат алу үшін белгіні басыңыз',
      'contacts.headline': 'Келіңіз — біз жақынбыз',
      'contacts.subtitle': 'Сұрақтарыңызға жауап беріп, техбайқауға қолайлы уақытты таңдаймыз.',
      'contacts.kicker': 'Бізбен байланысыңыз',
      'contacts.address.label': 'Мекенжай',
      'contacts.phone.label': 'Қоңырау шалыңыз',
      'contacts.phone2.label': 'Қосымша телефон',
      'contacts.email.label': 'Электрондық пошта',
      'contacts.hours.label': 'Жұмыс уақыты',
      'contacts.map.kicker': 'Сізді күтеміз',
      'contacts.map.open': 'Мекенжайды 2GIS-тен ашу',
      'contacts.note': 'Нақты орналасқан жері 2GIS-те көрсетілген. Клиенттерге арналған тұрақ бар.',

      'booking.title': 'Техбайқауға жазылу',
      'booking.kicker': 'Бар болғаны бірнеше минут',
      'booking.intro': 'Байланыс деректерін қалдырыңыз — қолайлы уақытты растаймыз.',
      'form.name': 'Аты',
      'form.name.ph': 'Сіздің атыңыз',
      'form.phone': 'Телефон',
      'form.phone.ph': '+7 (___) ___-__-__',
      'form.car': 'Марка және модель',
      'form.car.ph': 'Мысалы: Toyota Camry',
      'form.vehicleType': 'Көлік түрі',
      'form.vehicleType.choose': 'Түрін таңдаңыз',
      'form.vehicleType.passenger': 'Жеңіл көлік',
      'form.vehicleType.commercial': 'Жүк көлігі',
      'form.vehicleType.bus': 'Автобус',
      'form.vehicleType.motorcycle': 'Мотоцикл',
      'form.vehicleType.trailer': 'Тіркеме',
      'form.service': 'Қызмет',
      'form.service.choose': 'Қызметті таңдаңыз',
      'form.service.inspection': 'Техникалық байқау',
      'form.service.diagnostics': 'Диагностика',
      'form.service.insurance': 'ОСАГО',
      'form.service.tire': 'Шина орнату',
      'form.date': 'Күні',
      'form.date.ph': 'КК.АА.ЖЖЖЖ',
      'form.date.aria': 'Жазылу күні',
      'form.date.pick': 'Күнді таңдау',
      'form.date.hint': 'Күнтізбеден күнді таңдаңыз',
      'form.phone.hint': 'Үлгі: +7 (700) 123-45-67',
      'form.phone.invalid': 'Телефон нөмірін толық енгізіңіз',
      'form.date.required': 'Күнді таңдаңыз',
      'form.submit.error': 'Өтінімді жіберу мүмкін болмады. Қоңырау шалыңыз: 8 707 243 3010.',
      'form.submit.connection': 'Сервермен байланысу мүмкін болмады. Қайталап көріңіз немесе қоңырау шалыңыз: 8 707 243 3010.',
      'form.success.title': 'Өтінім жіберілді',
      'form.success.body': 'Растау үшін сізбен жақында хабарласамыз. Өтінім нөмірі:',
      'form.success.new': 'Тағы бір көлікке жазылу',
      'form.time.selectDate': 'Алдымен күнді таңдаңыз',
      'form.time.loading': 'Бос уақыт тексерілуде…',
      'form.time.none': 'Бұл күнге бос уақыт жоқ',
      'form.time.loadError': 'Уақытты жүктеу мүмкін болмады. Күнді қайта таңдаңыз.',
      'form.time.hint': 'Күнді таңдағаннан кейін бос уақытты көрсетеміз',
      'form.time.selectSlot': 'Уақытты таңдаңыз',
      'form.time.available': 'Бос уақыт нұсқалары',
      'form.submit.sending': 'Жіберілуде…',
      'form.time': 'Уақыты',
      'form.comment': 'Пікір',
      'form.comment.ph': '18:00-ден кейін ыңғайлы, кеңес керек және т.б.',
      'form.submit': 'Өтінім жіберу',
      'form.call': 'Қоңырау шалу',
      'policy': 'Жазылымды рәсімдеу үшін деректерімді өңдеуге келісемін.',
      'policy.link': 'Деректерді өңдеу саясаты',

      'msg.booking': 'Техбайқауға жазылу',
      'msg.name': 'Аты',
      'msg.phone': 'Телефон',
      'msg.car': 'Авто',
      'msg.desiredTime': 'Қалаған уақыт',
      'msg.comment': 'Пікір',
      'msg.sentFrom': 'at-c.kz сайтынан жіберілді',
      'footer.description': 'Астанадағы кәсіби техбайқау. Жылдам, ыңғайлы және талапқа сай.',
      'footer.faq': 'Сұрақтар мен жауаптар',
      'footer.privacy': 'Деректерді өңдеу саясаты',
      'footer.top': 'Жоғары ↑',
      'privacy.eyebrow': 'AUTO TECHNICAL CENTRE · АСТАНА',
      'privacy.title': 'Деректерді өңдеу саясаты',
      'privacy.intro': 'Бұл бөлімде техбайқауға жазылу үшін қандай деректер қажет екені, олардың не үшін пайдаланылатыны және деректерді өңдеу мәселелері бойынша орталықпен қалай байланысуға болатыны жазылған.',
      'privacy.operator.title': 'Деректерді кім өңдейді',
      'privacy.operator.text': 'Өтінімдерді Auto Technical Centre өңдейді. Жазылым және деректерді өңдеу туралы сұрақтар бойынша төмендегі телефонға немесе электрондық поштаға хабарласыңыз.',
      'privacy.data.title': 'Қандай деректер жиналады',
      'privacy.data.text': 'Өтінімді жіберген кезде сайт аты-жөніңізді, телефон нөміріңізді, көліктің маркасы мен моделін, көлік түрін, таңдалған қызметті, қалаған күн мен уақытты және қосымша пікірді алады.',
      'privacy.purpose.title': 'Деректер не үшін қажет',
      'privacy.purpose.text': 'Деректер жазылымды тіркеу және өңдеу, бос уақытты тексеру, растау үшін сізбен байланысу және өтінімдерді ішкі есепке алу мақсатында пайдаланылады. Өтінімдегі деректер сайтта жарияланбайды.',
      'privacy.access.title': 'Қолжетімділік және сақтау',
      'privacy.access.text': 'Өтінімдер сайт дерекқорында сақталады және жазылымды өңдеуге жауапты қызметкерлерге қолжетімді. Деректер осы мақсаттарға және қолданыстағы заң талаптарына қажетті мерзімде ғана сақталуы тиіс.',
      'privacy.rights.title': 'Сұрауларыңыз',
      'privacy.rights.text': 'Қолданыстағы заңнамаға сәйкес деректерді нақтылау, түзету, жою немесе келісімді қайтарып алу туралы өтініш бере аласыз. Өтінім нөмірін және сізбен байланысу тәсілін көрсетіңіз.',
      'privacy.note': 'Деректерді жинау және өңдеу Қазақстан Республикасының заңнамасымен реттеледі. Жарияламас бұрын сайт иесі оператордың толық заңды атауы мен осы мәтіннің өзектілігін тексеруі керек.',
      'privacy.law': 'ҚР «Дербес деректер және оларды қорғау туралы» заңы',
      'privacy.back': 'Сайтқа оралу',
      'header.home.aria': 'Басты бет — Auto Technical Centre',
      'footer.home.aria': 'Басты бетке',
      'footer.links.aria': 'Төменгі бөлім сілтемелері',
      'brand.tagline': 'ТЕХБАЙҚАУ ОРТАЛЫҒЫ'
    }
  };

  let siteSettings = {};
  const getLang = () => localStorage.getItem('lang') || 'ru';
  const getTheme = () => document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
  const setTheme = (theme) => {
    const value = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.dataset.theme = value;
    try { localStorage.setItem('atc-theme', value); } catch (_) {}
    const button = $('#themeToggle');
    const icon = $('#themeToggleIcon');
    const label = value === 'light' ? t('theme.toDark') : t('theme.toLight');
    if (button) { button.setAttribute('aria-label', label); button.setAttribute('aria-pressed', String(value === 'dark')); button.title = label; }
    if (icon) icon.className = `fa-solid ${value === 'light' ? 'fa-moon' : 'fa-sun'}`;
    const themeColor = $('meta[name="theme-color"]');
    if (themeColor) themeColor.content = value === 'dark' ? '#0b1118' : '#f4f5f6';
  };
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
    $$('[data-i18n-aria]').forEach(el => {
      const key = el.getAttribute('data-i18n-aria');
      if (key) el.setAttribute('aria-label', t(key, el.getAttribute('aria-label') || ''));
    });
    const calendarInput = $('#date');
    if (calendarInput) calendarInput.lang = lang === 'kk' ? 'kk' : 'ru';
    const phoneField = $('#phone');
    if (phoneField?.value) {
      const digits = phoneField.value.replace(/\D/g, '').slice(1);
      phoneField.setCustomValidity(digits.length > 0 && digits.length < 10 ? t('form.phone.invalid') : '');
    }
    const dateField = $('#dateDisplay');
    if (dateField) dateField.setCustomValidity($('#date')?.value ? '' : t('form.date.required'));
    applySiteSettings();
    // Toggle button label: show the next language code
    const btn = $('#langToggle');
    if (btn) {
      btn.textContent = lang === 'ru' ? 'KZ' : 'RU';
      btn.setAttribute('aria-label', lang === 'ru' ? 'Қазақ тіліне ауыстыру' : 'Переключить на русский');
    }
    setTheme(getTheme());
  };

  function applySiteSettings() {
    if (!siteSettings || !Object.keys(siteSettings).length) return;
    if (siteSettings.mainTitle) {
      document.title = siteSettings.mainTitle;
      $$('[data-site-title]').forEach(el => { el.textContent = siteSettings.mainTitle; });
    }
    if (siteSettings.siteDescription) {
      const meta = $('meta[name="description"]');
      if (meta) meta.content = siteSettings.siteDescription;
      $$('[data-site-description]').forEach(el => { el.textContent = siteSettings.siteDescription; });
    }
    if (siteSettings.address) {
      const address = getLang() === 'kk' ? siteSettings.address.replace(/^г\.\s*Астана,?\s*/i, 'Астана қ., ').replace(/^г\.\s*/i, 'Астана қ., ') : siteSettings.address;
      $$('[data-site-address]').forEach(el => { el.textContent = address; });
    }
    if (siteSettings.email) $$('[data-site-email]').forEach(el => { el.textContent = siteSettings.email; el.href = `mailto:${siteSettings.email}`; });
    if (siteSettings.workingHours) $$('[data-site-hours]').forEach(el => {
      const hours = getLang() === 'kk' ? siteSettings.workingHours.replace(/^Ежедневно\s*/i, 'Күн сайын ').replace(/^Каждый день\s*/i, 'Күн сайын ') : siteSettings.workingHours;
      el.textContent = hours;
    });
    if (siteSettings.mainPhone) {
      const digits = siteSettings.mainPhone.replace(/\D/g, '');
      const international = digits.startsWith('8') ? `+7${digits.slice(1)}` : `+${digits.startsWith('7') ? digits : `7${digits}`}`;
      const waNumber = international.replace(/\D/g, '');
      $$('[data-site-phone-link]').forEach(el => { el.href = `tel:${international}`; });
      $$('[data-site-phone-text]').forEach(el => { el.textContent = siteSettings.mainPhone; });
      $$('[data-site-whatsapp]').forEach(el => { el.href = `https://wa.me/${waNumber}`; });
    }
    const promo = getLang() === 'kk'
      ? (siteSettings.promoTextKk || siteSettings.promoTextRu || '')
      : (siteSettings.promoTextRu || siteSettings.promoTextKk || '');
    const heroPromo = $('#promoHeroBadge');
    const heroPromoText = $('#promoHeroText');
    const pricingPromo = $('#promoPricingNote');
    if (heroPromo) heroPromo.hidden = !promo;
    if (heroPromoText) heroPromoText.textContent = promo;
    if (pricingPromo) { pricingPromo.hidden = !promo; pricingPromo.textContent = promo; }
  }

  apiFetch('public-settings').then(response => response.ok ? response.json() : null)
    .then(settings => { if (settings) { siteSettings = settings; applySiteSettings(); } })
    .catch(() => {});

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
  $('#themeToggle')?.addEventListener('click', () => setTheme(getTheme() === 'light' ? 'dark' : 'light'));

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
      window.location.href = $('[data-site-phone-link]')?.href || 'tel:+77072433010';
    });
  }

  // Progressive Kazakhstan phone mask: +7 (700) 123-45-67
  const phoneInput = $('#phone');
  if (phoneInput) {
    const hasCountryPrefix = (value, digits) => (digits.startsWith('7') || digits.startsWith('8')) &&
      (/^\s*\+/.test(value) || digits.length > 10);
    const formatKZ = (value) => {
      let digits = value.replace(/\D/g, '');
      if (hasCountryPrefix(value, digits)) digits = digits.slice(1);
      digits = digits.slice(0, 10);
      if (!digits) return '';
      let result = `+7 (${digits.slice(0, 3)}`;
      if (digits.length >= 3) result += ')';
      if (digits.length > 3) result += ` ${digits.slice(3, 6)}`;
      if (digits.length > 6) result += `-${digits.slice(6, 8)}`;
      if (digits.length > 8) result += `-${digits.slice(8, 10)}`;
      return result;
    };
    const digitsBeforeCaret = (value, caret) => {
      const before = value.slice(0, caret).replace(/\D/g, '');
      const all = value.replace(/\D/g, '');
      return Math.max(0, before.length - (hasCountryPrefix(value, all) ? 1 : 0));
    };
    const positionAfterDigit = (value, digitCount) => {
      let seen = 0;
      for (let i = 0; i < value.length; i += 1) {
        if (/\d/.test(value[i])) seen += 1;
        if (seen >= digitCount + 1) return i + 1; // Include the fixed country code.
      }
      return value.length;
    };
    phoneInput.addEventListener('input', () => {
      const localDigitsBeforeCaret = digitsBeforeCaret(phoneInput.value, phoneInput.selectionStart || 0);
      phoneInput.value = formatKZ(phoneInput.value);
      const localDigits = phoneInput.value.replace(/\D/g, '').slice(1);
      phoneInput.setCustomValidity(localDigits.length > 0 && localDigits.length < 10 ? t('form.phone.invalid') : '');
      const caret = phoneInput.value ? positionAfterDigit(phoneInput.value, localDigitsBeforeCaret) : 0;
      phoneInput.setSelectionRange(caret, caret);
    });
    phoneInput.addEventListener('focus', () => {
      if (!phoneInput.value) {
        phoneInput.value = '+7 (';
        phoneInput.setCustomValidity(t('form.phone.invalid'));
        phoneInput.setSelectionRange(phoneInput.value.length, phoneInput.value.length);
      }
    });
    phoneInput.addEventListener('blur', () => {
      if (phoneInput.value.replace(/\D/g, '') === '7') {
        phoneInput.value = '';
        phoneInput.setCustomValidity('');
      }
    });
  }

  // Show a consistent Russian date while keeping an ISO value for the backend.
  const dateInput = $('#date');
  const dateDisplay = $('#dateDisplay');
  const datePickerButton = $('#datePickerButton');
  const timeSelect = $('#time');
  const timeHint = $('#timeHint');
  if (dateInput && dateDisplay && datePickerButton) {
    dateDisplay.setCustomValidity(t('form.date.required'));
    const today = new Date();
    dateInput.min = [today.getFullYear(), String(today.getMonth() + 1).padStart(2, '0'), String(today.getDate()).padStart(2, '0')].join('-');
    dateInput.addEventListener('change', () => {
      const [year, month, day] = dateInput.value.split('-');
      dateDisplay.value = year ? `${day}.${month}.${year}` : '';
      dateDisplay.setCustomValidity(dateInput.value ? '' : t('form.date.required'));
      loadAvailableTimes(dateInput.value);
    });
    const openCalendar = () => {
      try {
        if (typeof dateInput.showPicker === 'function') dateInput.showPicker();
        else dateInput.click();
      } catch { dateInput.focus(); dateInput.click(); }
    };
    dateDisplay.addEventListener('click', openCalendar);
    datePickerButton.addEventListener('click', openCalendar);
  }

  let availabilityRequest = 0;
  async function loadAvailableTimes(date) {
    if (!timeSelect) return;
    const requestId = ++availabilityRequest;
    timeSelect.disabled = true;
    timeSelect.replaceChildren(new Option(t('form.time.loading'), ''));
    if (!date) {
      timeSelect.replaceChildren(new Option(t('form.time.selectDate'), ''));
      if (timeHint) timeHint.textContent = t('form.time.hint');
      return;
    }
    if (timeHint) timeHint.textContent = t('form.time.loading');
    try {
      const response = await apiFetch(`availability?date=${encodeURIComponent(date)}`);
      const result = await response.json();
      if (requestId !== availabilityRequest) return;
      if (!response.ok) throw new Error(result.error || t('form.time.loadError'));
      const values = (result.availableTimes || []).filter(value => /^\d{2}:\d{2}$/.test(value));
      timeSelect.replaceChildren(new Option(values.length ? t('form.time.selectSlot', 'Выберите время') : t('form.time.none'), ''));
      values.forEach(value => timeSelect.add(new Option(value, value)));
      timeSelect.disabled = !values.length;
      if (timeHint) timeHint.textContent = values.length ? `${t('form.time.available', 'Свободных вариантов')}: ${values.length}` : t('form.time.none');
    } catch (error) {
      if (requestId !== availabilityRequest) return;
      timeSelect.replaceChildren(new Option(t('form.time.loadError'), ''));
      if (timeHint) timeHint.textContent = t('form.time.loadError');
    }
  }
  $('#langToggle')?.addEventListener('click', () => {
    if (dateInput?.value) loadAvailableTimes(dateInput.value);
    else if (timeSelect) timeSelect.replaceChildren(new Option(t('form.time.selectDate'), ''));
  });

  // Send the booking to the centre and confirm it on this page.
  const form = $('#bookingForm');
  if (form) {
    form.addEventListener('reset', () => setTimeout(() => {
      if (dateInput && dateDisplay) {
        dateDisplay.value = '';
        dateDisplay.setCustomValidity(t('form.date.required'));
      }
      if (timeSelect) {
        timeSelect.disabled = true;
        timeSelect.replaceChildren(new Option(t('form.time.selectDate'), ''));
      }
    }, 0));
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = $('#name')?.value?.trim() || '';
      const phone = $('#phone')?.value?.trim() || '';
      const car = $('#car')?.value?.trim() || '';
      const vehicleType = $('#vehicleType')?.value || '';
      const serviceType = 'inspection';
      const date = $('#date')?.value || '';
      const time = $('#time')?.value || '';
      if (!date) {
        dateDisplay?.setCustomValidity(t('form.date.required'));
        dateDisplay?.reportValidity();
        return;
      }
      const comment = $('#comment')?.value?.trim() || '';

      const submitButton = form.querySelector('[type="submit"]');
      if (submitButton.disabled) return;
      submitButton.disabled = true;
      const originalButtonContent = submitButton.innerHTML;
      const errorBox = $('#bookingError');
      if (errorBox) { errorBox.hidden = true; errorBox.textContent = ''; }
      submitButton.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${t('form.submit.sending', 'Отправляем…')}`;
      try {
        const response = await apiFetch('bookings', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, phone, car, vehicleType, serviceType, date, time, comment, consent: $('#consent')?.checked === true })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Не удалось отправить заявку');
        $('#bookingId').textContent = result.id;
        $('#bookingResult').hidden = false;
        form.reset();
        form.hidden = true;
        $('#bookingResult').scrollIntoView({ behavior: 'smooth', block: 'center' });
      } catch (error) {
        if (errorBox) {
          errorBox.textContent = error instanceof TypeError ? t('form.submit.connection') : error.message || t('form.submit.error');
          errorBox.hidden = false;
          if (error?.message?.includes('заняли')) loadAvailableTimes(date);
        } else alert(t('form.submit.error'));
      } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = originalButtonContent;
      }
    });
    $('#newBookingBtn')?.addEventListener('click', () => {
      $('#bookingResult').hidden = true;
      form.hidden = false;
      form.reset();
      $('#name')?.focus();
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
            <p style="margin: 8px 0; color: #333;"><strong>📞 Телефоны:</strong><br>8 707 243 3010<br>+7 776 848 27 44</p>
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
