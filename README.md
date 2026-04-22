# NovaTech - Интернет-магазин электроники с AI-ассистентом

Полнофункциональный интернет-магазин электроники с интегрированным AI-чатботом, системой тикетов, аналитикой.

## Стэк технологий

### Frontend
- Next.js 14 (App Router)
- React 18
- TypeScript
- Tailwind CSS
- shadcn/ui компоненты
- Framer Motion (анимации)
- Lucide Icons
- next-themes (тёмная тема)
- React Markdown

### Backend
- Python 3
- Flask
- Fireworks AI API (DeepSeek V3.2)
- OpenAI-compatible API
- Flask-CORS
- Flask-Limiter (rate limiting)
- Bleach (санитизация)
- python-dotenv

## Примеры вопросов для чатбота

- Какие наушники у вас есть?
- Сколько стоит доставка в Москву?
- Какой срок возврата товара?
- Принимаете ли вы карты МИР?
- Есть ли гарантия на Samsung Galaxy Watch?
- Как отследить мой заказ?
- Сравни AirPods Pro 2 и Sony WH-1000XM5

## Панель оператора

Доступна по адресу http://144.31.147.232:3000/operator

Возможности:
- Просмотр всех тикетов с фильтрацией по статусу
- Ответы на обращения клиентов
- Просмотр истории AI-чата для контекста
- Закрытие тикетов
- **Аналитика**: запросы, популярные вопросы, время ответа
- **Экспорт**: выгрузка тикетов и аналитики в CSV
- **Уведомления**: оповещения о новых обращениях (обновление каждые 5 секунд)


## Структура проекта

```
ai_shop_chat/
├── frontend/                  # Next.js приложение
│   ├── src/
│   │   ├── app/              # Роуты и layout
│   │   │   ├── page.tsx      # Главная страница
│   │   │   ├── operator/     # Панель оператора
│   │   │   └── layout.tsx    # Корневой layout + PWA
│   │   ├── components/       # React компоненты
│   │   │   ├── ChatWidget.tsx       # AI-чат с эскалацией
│   │   │   ├── ProductFilters.tsx   # Фильтрация товаров
│   │   │   ├── ProductCard.tsx      # Карточка товара
│   │   │   ├── CartWidget.tsx       # Корзина
│   │   │   ├── AuthModal.tsx        # Авторизация
│   │   │   └── ui/                  # shadcn/ui компоненты
│   │   ├── providers/        # Theme provider
│   │   ├── types/            # TypeScript типы
│   │   └── lib/              # Утилиты
│   ├── public/               # Статические файлы
│   │   ├── manifest.json     # PWA манифест
│   │   ├── sw.js             # Service worker
│   │   └── icons/            # PWA иконки
│   └── package.json
├── backend/                  # Flask API
│   ├── app.py               # Основной файл (все endpoints)
│   ├── data/                # JSON файлы с данными
│   │   ├── products.json    # Каталог товаров (25 товаров)
│   │   ├── orders.json      # Заказы
│   │   ├── users.json       # Пользователи
│   │   ├── tickets.json     # Тикеты поддержки
│   │   ├── chat_history.json# История чатов
│   │   ├── analytics.json   # Аналитика
│   │   ├── notifications.json # Уведомления
│   │   ├── delivery.json    # Условия доставки
│   │   ├── returns.json     # Условия возврата
│   │   └── faq.json         # FAQ
│   ├── requirements.txt
│   └── .env
├── README.md                # Этот файл
├── ARCHITECTURE.md          # Архитектура проекта
├── DEPLOY.md                # Инструкции по деплою
├── TEST_RESULTS.md          # Результаты тестирования
└── start.sh                 # Скрипт запуска
```

## API Endpoints

### Публичные
- `GET /api/products` — список товаров
- `GET /api/health` — проверка здоровья API
- `GET /api/order-status?query=<order_id|email>` — статус заказа

### Авторизованные
- `POST /api/register` — регистрация
- `POST /api/login` — вход
- `GET /api/profile` — профиль пользователя
- `PUT /api/profile` — обновление профиля
- `POST /api/orders` — создание заказа
- `GET /api/orders/me` — мои заказы
- `POST /api/chat` — сообщение AI-ассистенту
- `GET /api/chat-history` — история чата
- `POST /api/chat-history` — сохранение истории
- `POST /api/chat-history/clear` — очистка истории
- `POST /api/escalate` — эскалация на оператора
- `POST /api/tickets` — создание тикета
- `GET /api/tickets` — список тикетов
- `GET /api/tickets/<id>` — детали тикета
- `POST /api/tickets/<id>/reply` — ответ на тикет
- `POST /api/tickets/<id>/close` — закрытие тикета (оператор)

### Оператор
- `GET /api/analytics` — статистика
- `GET /api/analytics/export` — экспорт аналитики в CSV
- `GET /api/tickets/export` — экспорт тикетов в CSV
- `GET /api/notifications` — уведомления
- `POST /api/notifications/<id>/read` — отметить прочитанным
- `POST /api/notifications/read-all` — прочитать все

## Безопасность

- Rate limiting на всех публичных endpoints (Flask-Limiter)
- Санитизация ввода через Bleach
- Security headers (HSTS, X-Frame-Options, X-XSS-Protection, X-Content-Type-Options)
- Валидация email и паролей
- Хеширование паролей с солью (SHA-256)
- API ключи только в .env файлах
- CORS настроен на конкретный origin
