# Dashboard Getaran (Vite + Supabase)

Dashboard untuk memantau event getaran dari sensor MPU6050 via ESP32, dibaca dari tabel `vibration_events` di Supabase.

## 1. Setup lokal

```bash
npm install
cp .env.example .env
```

Buka file `.env`, isi dengan kredensial Supabase kamu (Project Settings → API):

```
VITE_SUPABASE_URL=https://xxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=isi_dengan_anon_public_key
```

Jalankan dev server:

```bash
npm run dev
```

Buka http://localhost:5173 — dashboard akan otomatis coba baca dari tabel `vibration_events`. Kalau tabelnya masih kosong, tampilan akan menunjukkan "Menunggu data event pertama…".

## 2. Struktur project

```
dashboard-getaran/
├── index.html            # struktur halaman
├── src/
│   ├── style.css          # styling (tema instrumen/panel pemantauan)
│   ├── supabaseClient.js  # koneksi ke Supabase pakai env var
│   └── main.js             # ambil data, render UI, chart, realtime
├── .env.example
├── .gitignore
├── package.json
└── vite.config.js
```

## 3. Catatan penting

- File `.env` **tidak** ikut ter-commit ke GitHub (sudah ada di `.gitignore`). Ini penting karena `.env` isinya kredensial.
- `VITE_SUPABASE_ANON_KEY` aman dipakai di sisi client karena tabel dilindungi Row Level Security (RLS) — anon key cuma bisa **SELECT** (baca), tidak bisa insert/update/delete.
- Saat deploy ke Vercel nanti, environment variable yang sama (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) perlu ditambahkan lagi di **Vercel → Settings → Environment Variables**, karena file `.env` lokal tidak ikut ke-push ke GitHub.

## 4. Build untuk production

```bash
npm run build
```

Hasil build ada di folder `dist/` — ini yang otomatis dideteksi & di-deploy Vercel.
