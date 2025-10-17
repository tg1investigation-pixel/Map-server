# Flask Map-server (Backend)

هذا مشروع باك-إند مبني بـ Flask لخدمة Map-server (بدون Docker). المزايا الأساسية:
- تسجيل ومصادقة JWT (Flask-JWT-Extended)
- CRUD للـ Geo-features (تخزين GeoJSON في حقل JSON)
- فلترة عن طريق bbox و pagination
- نقطة صحة /health
- مقاييس Prometheus (separate HTTP port)

ملفّات مهمة:
- run.py — نقطة الدخول لتشغيل التطبيق
- app/ — حزمة التطبيق
  - __init__.py — factory create_app
  - models.py — SQLAlchemy models (User, Feature)
  - routes/ — blueprints endpoints
  - schemas.py — marshmallow schemas
  - extensions.py — تهيئة الإضافات (db, migrate, jwt)
- requirements.txt — الحزم المطلوبة
- .env.example — مثال إعدادات البيئة

تشغيل محلي سريع:
1. انسخ .env.example إلى .env وعدّل القيم المطلوبة.
2. أنشئ virtualenv وثبّت الحزم:
   python -m venv .venv
   source .venv/bin/activate   # أو .venv\Scripts\activate على Windows
   pip install -r requirements.txt
3. (اختياري) استخدم Postgres عبر تغيير DATABASE_URL في .env، أو استخدم SQLite الافتراضي.
4. شغّل السيرفر:
   python run.py
   التطبيق على http://localhost:8000
5. Metrics Prometheus على المنفذ المذكور في PROMETHEUS_METRICS_PORT (افتراضي 8001).

ملاحظات تشغيل و production:
- هذا التصميم يبدأ بقاعدة JSON لسهولة التطوير. للـ production و استعلامات مكانية متقدمة استبدل الحقل geometry بعمود Geometry عبر PostGIS و GeoAlchemy2، و أنشئ مؤشرات مكانية و استعلامات باستخدام ST_Intersects.
- لواجهة production استخدم WSGI server مثل gunicorn:
  gunicorn -w 4 -b 0.0.0.0:8000 "run:app"
- أنصح بتشغيل Flask-Migrate (alembic) لإدارة migrations:
  flask db init
  flask db migrate -m "init"
  flask db upgrade

اختبار سريع:
- اختبر التسجيل:
  POST /auth/register
  { "username": "alice", "email": "alice@example.com", "password": "secret123" }

- تسجيل الدخول:
  POST /auth/login
  { "username": "alice", "password": "secret123" }

- إنشاء Feature (احرص أن تضيف Authorization header: Bearer <token>):
  POST /features
  {
    "name": "My point",
    "properties": { "foo": "bar" },
    "geometry": { "type": "Point", "coordinates": [31.2357, 30.0444] }
  }

- جلب GeoJSON:
  GET /maps/geojson?bbox=minx,miny,maxx,maxy&limit=100

توسعات مقترحة بعد التشغيل:
- ترقية إلى PostGIS + GeoAlchemy2 لتسريع الاستعلامات المكانية.
- إضافة اختبارات Pytest و CI (GitHub Actions).
- إضافة rate-limiting و role-based access و audit logs.
