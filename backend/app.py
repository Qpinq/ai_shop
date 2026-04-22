import os
import json
import re
import hashlib
import secrets
import logging
import time
from datetime import datetime
from functools import wraps
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import openai
from dotenv import load_dotenv
import bleach

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler("app.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": os.getenv("FRONTEND_URL", "http://localhost:3000")}})

limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"],
    storage_uri="memory://"
)

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")


def sanitize_input(text, max_length=5000):
    cleaned = bleach.clean(text, tags=[], attributes={}, strip=True)
    return cleaned[:max_length].strip()


def validate_email(email):
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None


def validate_password(password):
    return len(password) >= 6


def log_request(endpoint, method, status_code, duration):
    logger.info(
        f"{method} {endpoint} - {status_code} - {duration:.3f}s "
        f"IP: {request.remote_addr} UA: {request.user_agent.string[:50]}"
    )


def track_analytics(endpoint, method, status_code, duration, user_message=None):
    today = datetime.now().strftime("%Y-%m-%d")
    if today not in ANALYTICS_DATA["daily_stats"]:
        ANALYTICS_DATA["daily_stats"][today] = {
            "total_requests": 0,
            "total_chat_requests": 0,
            "total_errors": 0,
            "avg_response_time": 0,
            "response_times": []
        }
    
    stats = ANALYTICS_DATA["daily_stats"][today]
    stats["total_requests"] += 1
    stats["response_times"].append(duration)
    stats["avg_response_time"] = sum(stats["response_times"]) / len(stats["response_times"])
    
    if endpoint == "/api/chat" and method == "POST":
        stats["total_chat_requests"] += 1
        if user_message:
            question = user_message.lower().strip()
            found = False
            for q in ANALYTICS_DATA["popular_questions"]:
                if q["question"] == question:
                    q["count"] += 1
                    found = True
                    break
            if not found:
                ANALYTICS_DATA["popular_questions"].append({
                    "question": question,
                    "count": 1,
                    "first_seen": datetime.now().isoformat()
                })
    
    if status_code >= 400:
        stats["total_errors"] += 1
    
    ANALYTICS_DATA["requests"].append({
        "endpoint": endpoint,
        "method": method,
        "status_code": status_code,
        "duration": duration,
        "timestamp": datetime.now().isoformat(),
        "ip": request.remote_addr
    })
    
    if len(ANALYTICS_DATA["requests"]) > 10000:
        ANALYTICS_DATA["requests"] = ANALYTICS_DATA["requests"][-5000:]
    
    if len(ANALYTICS_DATA["popular_questions"]) > 100:
        ANALYTICS_DATA["popular_questions"] = sorted(
            ANALYTICS_DATA["popular_questions"], key=lambda x: x["count"], reverse=True
        )[:50]
    
    save_json("analytics.json", ANALYTICS_DATA)


@app.after_request
def after_request(response):
    duration = time.time() - request.environ.get("REQUEST_START_TIME", time.time())
    log_request(request.path, request.method, response.status_code, duration)
    track_analytics(request.path, request.method, response.status_code, duration)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response


@app.before_request
def before_request():
    request.environ["REQUEST_START_TIME"] = time.time()


def load_json(filename):
    filepath = os.path.join(DATA_DIR, filename)
    with open(filepath, "r", encoding="utf-8") as f:
        return json.load(f)


def save_json(filename, data):
    filepath = os.path.join(DATA_DIR, filename)
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


PRODUCTS_DATA = load_json("products.json")
ORDERS_DATA = load_json("orders.json")
USERS_DATA = load_json("users.json")
TICKETS_DATA = load_json("tickets.json")
CHAT_HISTORY_DATA = load_json("chat_history.json")
ANALYTICS_DATA = load_json("analytics.json")


def hash_password(password):
    salt = secrets.token_hex(16)
    hashed = hashlib.sha256((salt + password).encode()).hexdigest()
    return f"{salt}${hashed}"


def verify_password(password, stored):
    salt, hashed = stored.split("$")
    return hashlib.sha256((salt + password).encode()).hexdigest() == hashed


def generate_token():
    return secrets.token_urlsafe(32)


def get_user_from_token(token):
    for user in USERS_DATA["users"]:
        if user.get("token") == token:
            return user
    return None


def build_system_prompt():
    delivery_data = load_json("delivery.json")
    returns_data = load_json("returns.json")
    faq_data = load_json("faq.json")

    products_text = "\n".join(
        [
            f"- {p['name']} (ID: {p['id']}): {p['price']} {p['currency']}. Категория: {p['category']}. Бренд: {p['brand']}. Рейтинг: {p['rating']}/5 ({p['reviews_count']} отзывов). {p['description']}. Характеристики: {', '.join(p['specs'])}. {'В наличии' if p['in_stock'] else 'Нет в наличии'}."
            for p in PRODUCTS_DATA["products"]
        ]
    )

    delivery_text = "\n".join(
        [
            f"- {d['type']}: {d['time']}, стоимость {d['cost']}₽. {d['description']}"
            for d in delivery_data["delivery"]
        ]
    )

    returns_text = "\n".join(
        [f"- {r['title']}: {r['description']}" for r in returns_data["returns"]]
    )

    faq_text = "\n".join(
        [f"- Вопрос: {f['question']}\n  Ответ: {f['answer']}" for f in faq_data["faq"]]
    )

    categories = {}
    for p in PRODUCTS_DATA["products"]:
        cat = p["category"]
        if cat not in categories:
            categories[cat] = []
        categories[cat].append(f"{p['name']} (ID: {p['id']}) — {p['price']} {p['currency']}")

    categories_text = "\n".join(
        [f"**{cat}**: {', '.join(items)}" for cat, items in categories.items()]
    )

    orders_text = "\n".join(
        [f"- Заказ {o['order_id']}: email {o['email']}, статус «{o['status']}», товары: {', '.join(o['items'])}, сумма {o['total']}₽, дата {o['date']}, ожидаемая доставка {o['estimated_delivery']}."
         for o in ORDERS_DATA["orders"]]
    )

    prompt = f"""Ты — дружелюбный AI-ассистент интернет-магазина электроники NovaTech. Твоя задача — помогать покупателям выбирать товары, отвечать на вопросы о доставке, оплате, возврате, гарантии и статусе заказа.

Магазин: {PRODUCTS_DATA['store_name']}

=== КАТАЛОГ ТОВАРОВ ПО КАТЕГОРИЯМ ===
{categories_text}

=== ПОЛНАЯ ИНФОРМАЦИЯ О ТОВАРАХ ===
{products_text}

=== ДОСТАВКА ===
{delivery_text}
Регионы: {delivery_data['regions']}
Примечание: {delivery_data['notes']}

=== ВОЗВРАТ И ГАРАНТИЯ ===
{returns_text}
Гарантия: {returns_data['warranty']}

=== ЧАСТО ЗАДАВАЕМЫЕ ВОПРОСЫ ===
{faq_text}

=== БАЗА ЗАКАЗОВ ===
{orders_text}

============================================================
ПРАВИЛА ФОРМАТИРОВАНИЯ ОТВЕТОВ (STRICT):
============================================================

1. ИСПОЛЬЗУЙ ТОЛЬКО СЛЕДУЮЩИЕ MARKDOWN-ЭЛЕМЕНТЫ:
   - **жирный текст** — для названий товаров, цен, ключевых характеристик
   - *курсив* — для дополнительных пояснений
   - `- ` (дефис + пробел) — для списков
   - `**Заголовок:**` — для разделов ответа
   - Обычный текст — для описаний
   - НЕ используй: # заголовки, ``` блоки кода, таблицы, цитаты >, горизонтальные линии ---

2. СТРУКТУРА ОТВЕТА О ТОВАРЕ:
   **Название товара** — Цена
   - Краткое описание
   - Основные характеристики (3-5 пунктов)
   - Наличие
   - Призыв к действию (купить/добавить в корзину)

3. СТРУКТУРА СРАВНЕНИЯ ТОВАРОВ:
   **Сравнение:**
   - **Товар 1** — Цена. Плюсы: ... Минусы: ...
   - **Товар 2** — Цена. Плюсы: ... Минусы: ...
   **Рекомендация:** ваш совет, какой товар лучше и почему
   - ID: <число> (для рекомендованного товара)

============================================================
ПРАВИЛА ПОВЕДЕНИЯ:
============================================================

1. Отвечай ТОЛЬКО на вопросы о NovaTech: товары, доставка, оплата, возврат, гарантия, статус заказа.
2. На посторонние вопросы вежливо отвечай: «Я помогаю только с вопросами о магазине NovaTech. Спрашивайте о товарах, доставке или возврате!»
3. НИКОГДА не выдумывай цены, характеристики, условия. Используй только данные из промта.
4. Отвечай на русском языке.
5. Будь краток (3-7 предложений), но информативен.
6. При вопросе о конкретном товаре — укажи цену, ключевые характеристики и наличие.
7. При вопросе о доставке — укажи сроки, стоимость, условия бесплатной доставки.

============================================================
ПРАВИЛА СРАВНЕНИЯ ТОВАРОВ:
============================================================

1. Если пользователь спрашивает «что лучше», «сравни», «какой выбрать» — сравни 2-3 товара из одной категории.
2. Сравнивай по критериям: цена, ключевые характеристики, рейтинг, отзывы.
3. Дай чёткую рекомендацию: какой товар для каких целей лучше.
4. Укажи ID рекомендованного товара в формате: **ID: <число>**

Пример сравнения:
**Сравнение наушников:**
- **Apple AirPods Pro 2** — 18 990 ₽. Плюсы: лучшее шумоподавление, экосистема Apple. Рейтинг: 4.8/5
- **Sony WH-1000XM5** — 29 990 ₽. Плюсы: премиальный звук, 30ч работы. Рейтинг: 4.9/5
**Рекомендация:** для iPhone берите AirPods Pro 2, для музыки — Sony WH-1000XM5.
**ID: 1**

============================================================
ПРАВИЛА РЕКОМЕНДАЦИЙ:
============================================================

1. Если пользователь не знает, что выбрать — спроси о бюджете и целях использования.
2. Предлагай 2-3 варианта из разных ценовых категорий.
3. Для каждого варианта укажи: название, цену, 2-3 ключевых преимущества.
4. Если пользователь спрашивает про аксессуар — предложи совместимый товар.
5. Всегда завершай ответ призывом к действию: «Хотите добавить в корзину? Напишите ID товара.»

Пример рекомендации:
**Рекомендую рассмотреть:**
- **Xiaomi Smart Band 8** — 3 490 ₽. Отличный фитнес-трекер с AMOLED экраном
- **Samsung Galaxy Watch 6** — 24 990 ₽. Полноценные умные часы с GPS и ЭКГ
**ID: 5**

============================================================
ПРАВИЛА ОФОРМЛЕНИЯ ЗАКАЗА:
============================================================

1. Если пользователь хочет купить товар — укажи его ID в формате: **ID: <число>**
2. ID должен быть в КОНЦЕ ответа, отдельной строкой.
3. Если пользователь спрашивает про несколько товаров — укажи ID каждого.
4. Используй ТОЛЬКО числовые ID из каталога выше.

============================================================
ПРАВИЛА ПРОВЕРКИ СТАТУСА ЗАКАЗА:
============================================================

1. Если пользователь спрашивает «где мой заказ», «статус заказа», «отслеживание» — попроси номер заказа или email.
2. Найди заказ в базе по номеру (формат NT-XXXX-XXX) или email.
3. Сообщи статус, состав заказа, дату оформления и ожидаемую доставку.
4. Если заказ не найден — предложи обратиться в поддержку.
5. В конце ответа укажи: **ACTION: order_status**

============================================================
РАСПОЗНАВАНИЕ ЖАЛОБ И ПРОБЛЕМНЫХ ЗАПРОСОВ:
============================================================

1. Если пользователь выражает недовольство (слова: «не работает», «сломался», «брак», «возврат», «жалоба», «плохо», «обман», «деньги», «верните») — отнеси это к проблемному запросу.
2. Предложи решение: инструкция по возврату, обращение в поддержку, замена товара.
3. Если проблема сложная или пользователь настаивает на операторе — в конце ответа укажи: **ACTION: escalate**
4. Если проблема решается стандартно — в конце ответа укажи: **ACTION: return_instruction**

Пример ответа на жалобу:
**Понимаю вашу ситуацию.** Нам очень жаль, что возникла проблема.
- Вы можете оформить возврат в течение 14 дней
- Товар должен быть в оригинальной упаковке
- Средства вернутся на карту в течение 5 рабочих дней
**ACTION: return_instruction**

============================================================
ПРАВИЛА ЭСКАЛАЦИИ НА ОПЕРАТОРА:
============================================================

1. Если пользователь прямо просит «оператор», «менеджер», «живой человек», «позовите специалиста» — укажи **ACTION: escalate**
2. Если после двух ответов на жалобу пользователь всё ещё недоволен — укажи **ACTION: escalate**
3. При эскалации напиши: «Перевожу вас на специалиста поддержки. Ожидайте, пожалуйста.»
4. **ACTION: escalate** всегда указывается в КОНЦЕ ответа, отдельной строкой.

============================================================
СПИСОК ВСЕХ ID ТОВАРОВ:
============================================================
""" + "\n".join([f"- {p['id']}: {p['name']} ({p['category']})" for p in PRODUCTS_DATA["products"]])

    return prompt


SYSTEM_PROMPT = build_system_prompt()

client = openai.OpenAI(
    api_key=os.getenv("FIREWORKS_API_KEY"),
    base_url="https://api.fireworks.ai/inference/v1",
)

MODEL = os.getenv(
    "FIREWORKS_MODEL", "accounts/fireworks/models/deepseek-v3p2"
)


def extract_product_id(text):
    for product in PRODUCTS_DATA["products"]:
        if product["name"].lower() in text.lower():
            return product["id"]
    match = re.search(r'(?:ID|id|айди)[:\s]*(\d+)', text)
    if match:
        return int(match.group(1))
    return None


@app.route("/api/chat", methods=["POST"])
@limiter.limit("30 per minute")
def chat():
    data = request.json
    if not data:
        return jsonify({"response": "Неверный формат запроса.", "success": False}), 400

    user_message = sanitize_input(data.get("message", ""), max_length=1000)
    history = data.get("history", [])

    if not user_message:
        return jsonify({"response": "Пожалуйста, введите сообщение.", "success": False})

    if len(history) > 20:
        history = history[-20:]

    for msg in history:
        if isinstance(msg, dict):
            msg["content"] = sanitize_input(msg.get("content", ""), max_length=2000)

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]

    for msg in history[-10:]:
        messages.append({"role": msg.get("role", "user"), "content": msg.get("content", "")})

    messages.append({"role": "user", "content": user_message})

    try:
        start_time = time.time()
        response = client.chat.completions.create(
            model=MODEL,
            messages=messages,
            max_tokens=1500,
            temperature=0.7,
        )
        ai_duration = time.time() - start_time
        assistant_reply = response.choices[0].message.content
        
        product_id = extract_product_id(assistant_reply)
        
        track_analytics("/api/chat", "POST", 200, ai_duration, user_message=user_message)
        
        return jsonify({
            "response": assistant_reply,
            "success": True,
            "product_id": product_id
        })
    except openai.RateLimitError:
        logger.error("OpenAI rate limit exceeded")
        return jsonify({"response": "Сервис временно перегружен. Попробуйте через минуту.", "success": False}), 429
    except openai.APIError as e:
        logger.error(f"OpenAI API error: {e}")
        return jsonify({"response": "Ошибка сервиса AI. Попробуйте позже.", "success": False}), 502
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return jsonify({"response": "Извините, произошла ошибка. Попробуйте позже.", "success": False})


@app.route("/api/products", methods=["GET"])
def get_products():
    try:
        return jsonify(PRODUCTS_DATA)
    except Exception as e:
        print(f"Error loading products: {e}")
        return jsonify({"error": "Failed to load products"}), 500


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


@app.route("/api/register", methods=["POST"])
@limiter.limit("5 per minute")
def register():
    data = request.json
    if not data:
        return jsonify({"success": False, "error": "Неверный формат запроса"}), 400

    email = sanitize_input(data.get("email", "").strip().lower(), max_length=255)
    password = data.get("password", "")
    name = sanitize_input(data.get("name", "").strip(), max_length=100)

    if not email or not password or not name:
        return jsonify({"success": False, "error": "Заполните все поля"}), 400

    if not validate_email(email):
        return jsonify({"success": False, "error": "Неверный формат email"}), 400

    if not validate_password(password):
        return jsonify({"success": False, "error": "Пароль должен быть не менее 6 символов"}), 400

    for user in USERS_DATA["users"]:
        if user["email"] == email:
            return jsonify({"success": False, "error": "Пользователь уже существует"}), 409

    new_user = {
        "id": len(USERS_DATA["users"]) + 1,
        "name": name,
        "email": email,
        "password": hash_password(password),
        "phone": "",
        "address": "",
        "registered_at": datetime.now().isoformat(),
        "token": generate_token(),
    }

    USERS_DATA["users"].append(new_user)
    save_json("users.json", USERS_DATA)

    logger.info(f"New user registered: {email}")

    return jsonify({
        "success": True,
        "user": {
            "id": new_user["id"],
            "name": new_user["name"],
            "email": new_user["email"],
            "phone": new_user["phone"],
            "address": new_user["address"],
        },
        "token": new_user["token"],
    })


@app.route("/api/login", methods=["POST"])
@limiter.limit("10 per minute")
def login():
    data = request.json
    if not data:
        return jsonify({"success": False, "error": "Неверный формат запроса"}), 400

    email = sanitize_input(data.get("email", "").strip().lower(), max_length=255)
    password = data.get("password", "")

    if not email or not password:
        return jsonify({"success": False, "error": "Введите email и пароль"}), 400

    if not validate_email(email):
        return jsonify({"success": False, "error": "Неверный формат email"}), 400

    for user in USERS_DATA["users"]:
        if user["email"] == email and verify_password(password, user["password"]):
            new_token = generate_token()
            user["token"] = new_token
            save_json("users.json", USERS_DATA)

            logger.info(f"User logged in: {email}")

            return jsonify({
                "success": True,
                "user": {
                    "id": user["id"],
                    "name": user["name"],
                    "email": user["email"],
                    "phone": user.get("phone", ""),
                    "address": user.get("address", ""),
                },
                "token": new_token,
            })

    logger.warning(f"Failed login attempt: {email}")
    return jsonify({"success": False, "error": "Неверный email или пароль"}), 401


@app.route("/api/profile", methods=["GET"])
def get_profile():
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    user = get_user_from_token(token)

    if not user:
        return jsonify({"success": False, "error": "Не авторизован"}), 401

    return jsonify({
        "success": True,
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "phone": user.get("phone", ""),
            "address": user.get("address", ""),
        },
    })


@app.route("/api/profile", methods=["PUT"])
def update_profile():
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    user = get_user_from_token(token)

    if not user:
        return jsonify({"success": False, "error": "Не авторизован"}), 401

    data = request.json
    if "name" in data:
        user["name"] = data["name"].strip()
    if "phone" in data:
        user["phone"] = data["phone"].strip()
    if "address" in data:
        user["address"] = data["address"].strip()

    save_json("users.json", USERS_DATA)

    return jsonify({
        "success": True,
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "phone": user.get("phone", ""),
            "address": user.get("address", ""),
        },
    })


@app.route("/api/orders/me", methods=["GET"])
def get_my_orders():
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    user = get_user_from_token(token)

    if not user:
        return jsonify({"success": False, "error": "Не авторизован"}), 401

    user_orders = [o for o in ORDERS_DATA["orders"] if o["email"] == user["email"]]

    return jsonify({"success": True, "orders": user_orders})


@app.route("/api/orders", methods=["POST"])
def create_order():
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    user = get_user_from_token(token)

    if not user:
        return jsonify({"success": False, "error": "Не авторизован"}), 401

    data = request.json
    items = data.get("items", [])
    address = data.get("address", user.get("address", "")).strip()
    phone = data.get("phone", user.get("phone", "")).strip()

    if not items or not address or not phone:
        return jsonify({"success": False, "error": "Заполните все поля"}), 400

    total = sum(item.get("price", 0) * item.get("quantity", 0) for item in items)
    order_id = f"NT-{datetime.now().year}-{len(ORDERS_DATA['orders']) + 1:03d}"

    new_order = {
        "order_id": order_id,
        "email": user["email"],
        "status": "Обработан",
        "items": [item["name"] for item in items],
        "total": total,
        "date": datetime.now().strftime("%Y-%m-%d"),
        "estimated_delivery": "3-5 дней",
        "address": address,
        "phone": phone,
    }

    ORDERS_DATA["orders"].append(new_order)
    save_json("orders.json", ORDERS_DATA)

    return jsonify({"success": True, "order": new_order})


@app.route("/api/order-status", methods=["GET"])
def check_order_status():
    query = request.args.get("query", "").strip().lower()

    if not query:
        return jsonify({"success": False, "error": "Укажите номер заказа или email"}), 400

    for order in ORDERS_DATA["orders"]:
        if order["order_id"].lower() == query or order["email"].lower() == query:
            return jsonify({"success": True, "order": order})

    return jsonify({"success": False, "error": "Заказ не найден"}), 404


@app.route("/api/escalate", methods=["POST"])
@limiter.limit("3 per minute")
def escalate_to_operator():
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    user = get_user_from_token(token)

    if not user:
        return jsonify({"success": False, "error": "Не авторизован"}), 401

    data = request.json
    if not data:
        return jsonify({"success": False, "error": "Неверный формат запроса"}), 400

    subject = sanitize_input(data.get("subject", "Обращение в поддержку").strip(), max_length=500)
    message = sanitize_input(data.get("message", "").strip(), max_length=5000)
    chat_history = data.get("chat_history", [])

    if not message:
        return jsonify({"success": False, "error": "Опишите проблему"}), 400

    if not isinstance(chat_history, list):
        chat_history = []

    ticket_id = f"TK-{len(TICKETS_DATA['tickets']) + 1:04d}"

    new_ticket = {
        "ticket_id": ticket_id,
        "user_id": user["id"],
        "user_name": user["name"],
        "user_email": user["email"],
        "subject": subject,
        "message": message,
        "status": "open",
        "created_at": datetime.now().isoformat(),
        "replies": [],
        "chat_history": chat_history,
    }

    TICKETS_DATA["tickets"].append(new_ticket)
    save_json("tickets.json", TICKETS_DATA)

    logger.info(f"Ticket escalated: {ticket_id} by user {user['email']}")

    create_notification(
        title="Новое обращение от оператора",
        message=f"Пользователь {user['name']} ({user['email']}) запросил оператора. Тикет: {ticket_id}",
        notification_type="escalation"
    )

    return jsonify({"success": True, "ticket_id": ticket_id})


@app.route("/api/tickets", methods=["GET"])
def get_tickets():
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    user = get_user_from_token(token)

    if not user:
        return jsonify({"success": False, "error": "Не авторизован"}), 401

    is_operator = user.get("is_operator", False)

    if is_operator:
        tickets = TICKETS_DATA["tickets"]
    else:
        tickets = [t for t in TICKETS_DATA["tickets"] if t["user_id"] == user["id"]]

    return jsonify({"success": True, "tickets": tickets})


@app.route("/api/tickets", methods=["POST"])
def create_ticket():
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    user = get_user_from_token(token)

    if not user:
        return jsonify({"success": False, "error": "Не авторизован"}), 401

    data = request.json
    subject = data.get("subject", "Обращение в поддержку").strip()
    message = data.get("message", "").strip()

    if not message:
        return jsonify({"success": False, "error": "Опишите проблему"}), 400

    ticket_id = f"TK-{len(TICKETS_DATA['tickets']) + 1:04d}"

    new_ticket = {
        "ticket_id": ticket_id,
        "user_id": user["id"],
        "user_name": user["name"],
        "user_email": user["email"],
        "subject": subject,
        "message": message,
        "status": "open",
        "created_at": datetime.now().isoformat(),
        "replies": [],
    }

    TICKETS_DATA["tickets"].append(new_ticket)
    save_json("tickets.json", TICKETS_DATA)

    create_notification(
        title="Новый тикет поддержки",
        message=f"Пользователь {user['name']} создал обращение: {subject}",
        notification_type="ticket"
    )

    return jsonify({"success": True, "ticket": new_ticket})


@app.route("/api/tickets/<ticket_id>/reply", methods=["POST"])
def reply_to_ticket(ticket_id):
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    user = get_user_from_token(token)

    if not user:
        return jsonify({"success": False, "error": "Не авторизован"}), 401

    ticket = None
    for t in TICKETS_DATA["tickets"]:
        if t["ticket_id"] == ticket_id:
            ticket = t
            break

    if not ticket:
        return jsonify({"success": False, "error": "Тикет не найден"}), 404

    data = request.json
    reply_message = data.get("message", "").strip()

    if not reply_message:
        return jsonify({"success": False, "error": "Введите сообщение"}), 400

    is_operator = user.get("is_operator", False)
    sender_role = "operator" if is_operator else "user"

    reply = {
        "sender": user["name"],
        "sender_role": sender_role,
        "message": reply_message,
        "created_at": datetime.now().isoformat(),
    }

    ticket["replies"].append(reply)

    if is_operator and ticket["status"] == "open":
        ticket["status"] = "in_progress"
    elif not is_operator and ticket["status"] == "closed":
        ticket["status"] = "open"

    save_json("tickets.json", TICKETS_DATA)

    return jsonify({"success": True, "reply": reply})


@app.route("/api/tickets/<ticket_id>/close", methods=["POST"])
def close_ticket(ticket_id):
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    user = get_user_from_token(token)

    if not user or not user.get("is_operator", False):
        return jsonify({"success": False, "error": "Только для операторов"}), 403

    ticket = None
    for t in TICKETS_DATA["tickets"]:
        if t["ticket_id"] == ticket_id:
            ticket = t
            break

    if not ticket:
        return jsonify({"success": False, "error": "Тикет не найден"}), 404

    ticket["status"] = "closed"
    save_json("tickets.json", TICKETS_DATA)

    return jsonify({"success": True})


@app.route("/api/tickets/<ticket_id>", methods=["GET"])
def get_ticket(ticket_id):
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    user = get_user_from_token(token)

    if not user:
        return jsonify({"success": False, "error": "Не авторизован"}), 401

    ticket = None
    for t in TICKETS_DATA["tickets"]:
        if t["ticket_id"] == ticket_id:
            ticket = t
            break

    if not ticket:
        return jsonify({"success": False, "error": "Тикет не найден"}), 404

    is_operator = user.get("is_operator", False)
    if not is_operator and ticket["user_id"] != user["id"]:
        return jsonify({"success": False, "error": "Доступ запрещён"}), 403

    return jsonify({"success": True, "ticket": ticket})


@app.route("/api/chat-history", methods=["GET"])
def get_chat_history():
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    user = get_user_from_token(token)

    if not user:
        return jsonify({"success": False, "error": "Не авторизован"}), 401

    for history in CHAT_HISTORY_DATA["chat_histories"]:
        if history["user_id"] == user["id"]:
            return jsonify({"success": True, "messages": history["messages"], "operator_mode": history.get("operator_mode", False), "active_ticket_id": history.get("active_ticket_id")})

    return jsonify({"success": True, "messages": [], "operator_mode": False, "active_ticket_id": None})


@app.route("/api/chat-history", methods=["POST"])
def save_chat_history():
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    user = get_user_from_token(token)

    if not user:
        return jsonify({"success": False, "error": "Не авторизован"}), 401

    data = request.json
    messages = data.get("messages", [])

    found = False
    for history in CHAT_HISTORY_DATA["chat_histories"]:
        if history["user_id"] == user["id"]:
            history["messages"] = messages
            history["updated_at"] = datetime.now().isoformat()
            found = True
            break

    if not found:
        CHAT_HISTORY_DATA["chat_histories"].append({
            "user_id": user["id"],
            "messages": messages,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
        })

    save_json("chat_history.json", CHAT_HISTORY_DATA)

    return jsonify({"success": True})


@app.route("/api/chat-history/clear", methods=["POST"])
def clear_chat_history():
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    user = get_user_from_token(token)

    if not user:
        return jsonify({"success": False, "error": "Не авторизован"}), 401

    CHAT_HISTORY_DATA["chat_histories"] = [
        h for h in CHAT_HISTORY_DATA["chat_histories"] if h["user_id"] != user["id"]
    ]
    save_json("chat_history.json", CHAT_HISTORY_DATA)

    return jsonify({"success": True})


@app.route("/api/analytics", methods=["GET"])
def get_analytics():
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    user = get_user_from_token(token)

    if not user or not user.get("is_operator", False):
        return jsonify({"success": False, "error": "Только для операторов"}), 403

    today = datetime.now().strftime("%Y-%m-%d")
    daily = ANALYTICS_DATA["daily_stats"].get(today, {})
    
    total_requests = sum(s.get("total_requests", 0) for s in ANALYTICS_DATA["daily_stats"].values())
    total_chat = sum(s.get("total_chat_requests", 0) for s in ANALYTICS_DATA["daily_stats"].values())
    total_errors = sum(s.get("total_errors", 0) for s in ANALYTICS_DATA["daily_stats"].values())
    
    all_times = []
    for s in ANALYTICS_DATA["daily_stats"].values():
        all_times.extend(s.get("response_times", []))
    avg_time = sum(all_times) / len(all_times) if all_times else 0
    
    popular = sorted(ANALYTICS_DATA.get("popular_questions", []), key=lambda x: x["count"], reverse=True)[:10]
    
    recent_requests = ANALYTICS_DATA.get("requests", [])[-20:]
    recent_requests.reverse()
    
    return jsonify({
        "success": True,
        "analytics": {
            "today": {
                "total_requests": daily.get("total_requests", 0),
                "chat_requests": daily.get("total_chat_requests", 0),
                "errors": daily.get("total_errors", 0),
                "avg_response_time": round(daily.get("avg_response_time", 0), 3)
            },
            "total": {
                "total_requests": total_requests,
                "chat_requests": total_chat,
                "errors": total_errors,
                "avg_response_time": round(avg_time, 3)
            },
            "popular_questions": popular,
            "recent_requests": recent_requests,
            "open_tickets": len([t for t in TICKETS_DATA["tickets"] if t["status"] == "open"]),
            "total_tickets": len(TICKETS_DATA["tickets"]),
            "total_users": len(USERS_DATA["users"]),
            "total_orders": len(ORDERS_DATA["orders"])
        }
    })


@app.route("/api/analytics/export", methods=["GET"])
def export_analytics_csv():
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    user = get_user_from_token(token)

    if not user or not user.get("is_operator", False):
        return jsonify({"success": False, "error": "Только для операторов"}), 403

    import csv
    import io
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Дата", "Всего запросов", "Чат запросов", "Ошибки", "Среднее время ответа (с)"])
    
    for date, stats in sorted(ANALYTICS_DATA["daily_stats"].items()):
        writer.writerow([
            date,
            stats.get("total_requests", 0),
            stats.get("total_chat_requests", 0),
            stats.get("total_errors", 0),
            round(stats.get("avg_response_time", 0), 3)
        ])
    
    output.seek(0)
    return output.getvalue(), 200, {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment; filename=analytics.csv"
    }


@app.route("/api/tickets/export", methods=["GET"])
def export_tickets_csv():
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    user = get_user_from_token(token)

    if not user or not user.get("is_operator", False):
        return jsonify({"success": False, "error": "Только для операторов"}), 403

    import csv
    import io
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID тикета", "Пользователь", "Email", "Тема", "Статус", "Дата создания", "Ответов"])
    
    for ticket in TICKETS_DATA["tickets"]:
        writer.writerow([
            ticket["ticket_id"],
            ticket["user_name"],
            ticket["user_email"],
            ticket["subject"],
            ticket["status"],
            ticket["created_at"],
            len(ticket.get("replies", []))
        ])
    
    output.seek(0)
    return output.getvalue(), 200, {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment; filename=tickets.csv"
    }


NOTIFICATIONS_DATA = load_json("notifications.json")


@app.route("/api/notifications", methods=["GET"])
def get_notifications():
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    user = get_user_from_token(token)

    if not user or not user.get("is_operator", False):
        return jsonify({"success": False, "error": "Только для операторов"}), 403

    user_notifications = [
        n for n in NOTIFICATIONS_DATA["notifications"]
        if not n.get("read", False)
    ]

    return jsonify({"success": True, "notifications": user_notifications, "count": len(user_notifications)})


@app.route("/api/notifications/<notification_id>/read", methods=["POST"])
def mark_notification_read(notification_id):
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    user = get_user_from_token(token)

    if not user or not user.get("is_operator", False):
        return jsonify({"success": False, "error": "Только для операторов"}), 403

    for n in NOTIFICATIONS_DATA["notifications"]:
        if n["id"] == notification_id:
            n["read"] = True
            break

    save_json("notifications.json", NOTIFICATIONS_DATA)
    return jsonify({"success": True})


@app.route("/api/notifications/read-all", methods=["POST"])
def mark_all_notifications_read():
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    user = get_user_from_token(token)

    if not user or not user.get("is_operator", False):
        return jsonify({"success": False, "error": "Только для операторов"}), 403

    for n in NOTIFICATIONS_DATA["notifications"]:
        n["read"] = True

    save_json("notifications.json", NOTIFICATIONS_DATA)
    return jsonify({"success": True})


def create_notification(title, message, notification_type="info"):
    notification_id = f"NOTIF-{len(NOTIFICATIONS_DATA['notifications']) + 1:04d}"
    new_notification = {
        "id": notification_id,
        "title": title,
        "message": message,
        "type": notification_type,
        "created_at": datetime.now().isoformat(),
        "read": False,
    }
    NOTIFICATIONS_DATA["notifications"].append(new_notification)
    if len(NOTIFICATIONS_DATA["notifications"]) > 500:
        NOTIFICATIONS_DATA["notifications"] = NOTIFICATIONS_DATA["notifications"][-200:]
    save_json("notifications.json", NOTIFICATIONS_DATA)
    return notification_id


if __name__ == "__main__":
    port = int(os.getenv("BACKEND_PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
