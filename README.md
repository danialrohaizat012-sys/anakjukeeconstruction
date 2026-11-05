# AJC Construction: Sistem Tapak

Sistem dalaman AJC Construction (aluminium & kaca). Ia buka di telefon staff, dan boleh "Add to Home Screen" supaya nampak seperti app.

## Fungsi

**1. Ukuran tapak (ganti buku ukur)**
- Satu rekod untuk setiap projek: pelanggan, telefon, alamat dan status (Ukur → Fabrikasi → Pasang → Siap).
- Setiap bukaan direkod dengan lokasi, jenis item, **lebar × tinggi (mm)**, kuantiti, bilangan panel, jenis kaca, warna frame, nota dan gambar tapak.
- Lakaran bukaan dibuat automatik, siap dengan garisan dimensi. Keluasan kaca (m²) dikira sendiri.
- Carian merentas semua projek, contohnya "shower", nama pelanggan atau alamat.
- Butang **Cetak** mengeluarkan helaian ukuran A4 untuk bengkel / fabrikasi.
- Butang Waze / Google Maps ke tapak.

**2. Punch in / punch out dengan GPS**
- Staff pilih tapak dan tekan **Punch In**. Lokasi GPS dan ketepatannya direkod.
- Sistem kira jarak dari tapak. Kalau jarak melebihi radius (default 200 m), rekod ditanda merah **"luar kawasan"**.
- Admin boleh lihat kehadiran semua staff, jumlah jam setiap staff dan pautan peta untuk setiap punch. Data boleh dimuat turun sebagai CSV (dibuka dengan Excel).

**3. Pengurusan staff (admin)**: tambah staff, reset kata laluan dan nyahaktif akaun.

## Deploy ke Vercel

Vercel tiada storan fail kekal, jadi semua data (termasuk gambar) disimpan dalam **database Postgres**.

1. Di Vercel, pilih **Add New → Project** dan import repo ini. Framework preset: **Other**. Tak perlu ubah tetapan build.
2. Di projek Vercel, buka tab **Storage → Create Database → Neon (Postgres)**. Pelan percuma sudah cukup. Sambungkan database itu ke projek ini. Vercel akan tambah `DATABASE_URL` secara automatik.
3. (Disyorkan) Di **Settings → Environment Variables**, tambah `ADMIN_PASSWORD` dengan kata laluan admin pertama anda.
4. **Redeploy**, kemudian buka `https://<nama-projek>.vercel.app`. Jadual database dicipta sendiri pada permintaan pertama.
5. Log masuk dengan username `admin` dan kata laluan dari langkah 3 (default `ajc12345` jika tidak ditetapkan). **Tukar kata laluan segera** di menu Akaun.

Domain sendiri, contohnya `tapak.ajcconstruction.my`, boleh ditambah di **Settings → Domains**. HTTPS disediakan automatik, dan GPS telefon memang wajib guna HTTPS.

### Environment variables

| Nama | Wajib | Guna |
|---|---|---|
| `DATABASE_URL` | Ya | Sambungan Postgres (Neon / Supabase / lain-lain). `POSTGRES_URL` juga diterima |
| `ADMIN_PASSWORD` | Disyorkan | Kata laluan akaun admin pertama (hanya digunakan sekali) |

## Jalankan di komputer sendiri

Perlu Node.js 20+ dan satu database Postgres.

```bash
npm install
DATABASE_URL=postgres://user:pass@localhost:5432/ajc npm run dev
```

Kemudian buka `http://localhost:3000`.

## Struktur

```
api/index.js     Vercel Function: semua /api/* dihalakan ke sini
lib/app.js       Logik API + schema database
server.js        Server untuk local / VPS (static + API)
public/          Frontend (HTML/CSS/JS, logo, ikon PWA)
vercel.json      Tetapan Vercel
```

## Backup

Neon ada fungsi backup / point-in-time restore. Untuk salinan sendiri:

```bash
pg_dump "$DATABASE_URL" > backup-ajc.sql
```
