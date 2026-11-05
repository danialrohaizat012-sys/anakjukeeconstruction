# AJC Construction: Sistem Tapak

Sistem dalaman AJC Construction (aluminium & kaca) untuk:
- **ukuran tapak**, menggantikan buku ukur
- **punch in / out staff dengan GPS**

Ia dibuka di telefon dan boleh "Add to Home Screen" supaya nampak seperti app.

> **Status: MOD DEMO.** Data disimpan dalam browser peranti masing-masing (localStorage) sahaja. Ia tidak dikongsi antara telefon, dan hilang jika data browser dipadam. Untuk kegunaan sebenar, sambung ke Supabase. Lihat bahagian [Sambung database](#sambung-database-nanti).

## Fungsi

**Dashboard admin (Utama)**
- Siapa sedang bertugas sekarang, lokasi tapak dan status GPS.
- Aliran projek: Ukur → Fabrikasi → Pasang → Siap.
- Jumlah kaca (m²) dalam proses dan amaran GPS 7 hari.
- Suapan aktiviti terkini (ukuran baru, punch in/out).

**Ukuran tapak (ganti buku ukur)**
- Pilih jenis item guna jubin bergambar.
- Lebar × tinggi dalam **mm**, dengan penukaran automatik ke **kaki-inci**.
- Amaran jika saiz nampak salah unit (contohnya dimasukkan dalam cm).
- Kuantiti dan panel guna butang − / +. Chip pilihan cepat untuk lokasi, jenis kaca dan warna frame.
- Lakaran bukaan automatik dengan garisan dimensi. Gambar tapak dari kamera.
- "Simpan & tambah lagi" mengekalkan jenis, kaca dan frame untuk bukaan seterusnya.
- Tab **Ringkasan**: pesanan kaca ikut jenis kaca, jenis item dan warna frame (unit & m²).
- Kongsi senarai ukuran ke **WhatsApp** (umum atau terus ke pelanggan), atau salin teks.
- Helaian ukuran A4 untuk bengkel (butang Cetak). Butang Waze, Maps dan Telefon pelanggan.

**Punch in / punch out dengan GPS**
- Butang besar; kad bertukar hijau bila sedang bertugas.
- Skrin pengesahan dengan getaran telefon.
- Jarak dari tapak disemak. Jika lebih dari radius, rekod ditanda **luar kawasan** dan admin akan nampak.
- Rekod dengan penapis Hari ini / 7 hari / 30 hari, ringkasan jam setiap staff, dan muat turun CSV (Excel).

**Lain-lain**
- Urus staff (admin): tambah staff, reset kata laluan, nyahaktif akaun, tukar peranan.
- Boleh dipasang di telefon (PWA) dan dibuka **tanpa internet**.
- Paparan telefon: bottom nav. Paparan desktop pejabat: sidebar.

## Akaun demo

| Peranan | Username | Kata laluan |
|---|---|---|
| Admin | `admin` | `ajc12345` |
| Staff | `ali` | `ali123` |
| Staff | `faiz` | `faiz123` |
| Staff | `zul` | `zul123` |

Untuk kembali kepada data contoh, buka menu **Akaun → Reset data demo**.

## Hidupkan di GitHub Pages

1. Di repo GitHub, buka **Settings → Pages**.
2. Bahagian **Build and deployment**: pilih Source **Deploy from a branch**, Branch **`main`**, dan folder **`/docs`**. Tekan **Save**.
3. Tunggu 1–2 minit. Sistem akan live di:
   **https://danialrohaizat012-sys.github.io/anakjukeeconstruction/**

Setiap kali kod dipush ke `main`, laman akan dikemas kini sendiri.

## Sambung database (nanti)

Semua akses data melalui satu fail: `docs/demo-backend.js`. Fail ini menyediakan `AJCBackend.request(method, path, body)` dengan laluan API yang sama seperti backend sebenar (`/api/projects`, `/api/attendance/in` dan lain-lain).

Untuk guna Supabase, gantikan fail ini dengan versi yang memanggil Supabase. Bahagian lain aplikasi (`app.js`) tidak perlu diubah.

## Struktur

```
docs/index.html         Halaman utama
docs/app.js             Antara muka (skrin, borang, lakaran ukuran)
docs/demo-backend.js    Lapisan data — DEMO (localStorage)
docs/style.css          Gaya / branding AJC
docs/sw.js              Service worker (offline)
docs/logo.png, icon-*   Logo & ikon app
```
