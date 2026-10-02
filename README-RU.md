# Funding Profit Scanner v2.0

Архитектура: Binance LIVE → Railway → LIVE SHADOW Recorder → History → Web/APK.

## Что добавлено
- серверный скан каждые 30 секунд;
- автоматический поиск Spot + USDT-M Perpetual;
- анализ глубины двух стаканов и одинакового hedge-qty;
- автоматическая фиксация Shadow decision за 5 минут до funding;
- TAKE/SKIP фиксируется до события и не переписывается задним числом;
- post-funding settlement через 5 минут после начисления;
- Actual funding rate из Binance funding history;
- Realized Shadow NET = actual funding + фактический PnL двух ног - 4 taker fees;
- Expected NET vs Realized NET и ошибка прогноза;
- `/api/live`, `/api/history`, `/api/summary`, `/health`;
- PostgreSQL используется автоматически при наличии `DATABASE_URL`; иначе локальный JSON fallback.

## Railway ENV
PORT=8080
SCAN_INTERVAL_MS=30000
FUNDING_WINDOW_MIN=10
SHADOW_ENTRY_LEAD_MIN=5
SHADOW_EXIT_DELAY_MIN=5
TOP_CANDIDATES=8
NOTIONAL_USDT=500
SPOT_TAKER_FEE=0.001
FUT_TAKER_FEE=0.0005
DATABASE_URL=<Railway Postgres URL>

Для production обязательно использовать PostgreSQL/постоянное хранилище; JSON fallback предназначен для локального теста.
