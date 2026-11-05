# AJC Construction: Sistem Tapak

Sistem dalaman AJC Construction (aluminium & kaca) untuk:
- **ukuran tapak**, menggantikan buku ukur
- **punch in / out staff dengan GPS**

Ia dibuka di telefon dan boleh "Add to Home Screen" supaya nampak seperti app.

> **Status: MOD DEMO.** Data disimpan dalam browser peranti masing-masing (localStorage) sahaja. Ia tidak dikongsi antara telefon, dan hilang jika data browser dipadam. Untuk kegunaan sebenar, sambung ke Supabase. Lihat bahagian [Sambung database](#sambung-database-nanti).

## Fungsi

**1. Ukuran tapak**
- Satu rekod untuk setiap projek: pelanggan, telefon, alamat dan status (Ukur → Fabrikasi → Pasang → Siap).
- Setiap bukaan direkod dengan lokasi, jenis item, **lebar × tinggi (mm)**, kuantiti, bilangan panel, jenis kaca, warna frame, nota dan gambar.
- Lakaran bukaan dibuat automatik, siap dengan garisan dimensi. Keluasan kaca (m²) dikira sendiri.
- Carian merentas semua projek.
- Butang **Cetak** mengeluarkan helaian ukuran A4.
- Butang Waze / Google Maps ke tapak.

**2. Punch in / punch out dengan GPS**
- Staff pilih tapak dan tekan **Punch In**. Lokasi GPS dan ketepatannya direkod.
- Jika jarak dari tapak melebihi radius (default 200 m), rekod ditanda merah **"luar kawasan"**.
- Admin boleh lihat rekod semua staff dan jumlah jam setiap staff, serta muat turun CSV (Excel).

**3. Urus staff (admin)**: tambah staff, reset kata laluan dan nyahaktif akaun.

## Akaun demo

| Peranan | Username | Kata laluan |
|---|---|---|
| Admin | `admin` | `ajc12345` |
| Staff | `ali` | `ali123` |
| Staff | `faiz` | `faiz123` |

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
docs/logo.png, icon-*   Logo & ikon app
```
