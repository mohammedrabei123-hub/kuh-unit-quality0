# منصة ضمان الجودة — مستشفيات جامعة كفر الشيخ
React + Vite + TypeScript + Tailwind (RTL) + Supabase — جاهزة للنشر على Vercel.

## 1) قاعدة البيانات (Supabase → SQL Editor، بالترتيب)
1. `01_schema.sql` أو `03_migrate.sql` (اللي عندك بالفعل)
2. `sql/04_dashboard_views.sql` — views الداشبورد
3. `sql/05_rounds_settings.sql` — عمود الجولة + جدول الإعدادات + `create_user` + `save_assessment_items`
4. `sql/06_seed_checklist.sql` — (اختياري) معايير الإكسيل الفعلية وربطها بالأقسام (بيضيف 6 أقسام ناقصة)

## 2) Vercel
Framework: Vite · Build: `npm run build` · Output: `dist`
Environment Variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
(أو `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` — الاتنين مدعومين)

## 3) تشغيل محلي
`npm i && npm run dev` (ملف `.env` موجود — مش بيترفع على GitHub)

## الشاشات
الداشبورد · الأقسام + جولات كل قسم · نموذج التقييم (مسودة/اعتماد) · سجل التقييمات · التقارير (مصفوفة + CSV + طباعة) · الإدارة (أقسام، معايير، مستخدمين، عدد الجولات، سجل التدقيق)
