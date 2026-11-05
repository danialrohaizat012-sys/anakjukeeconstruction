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

## Jalankan

Perlu **Node.js 22.13 atau lebih baru**. Tiada library lain diperlukan.

```bash
npm start
```

Buka `http://localhost:3000`. Pada kali pertama, akaun admin dicipta secara automatik:

- username: `admin`
- password: `ajc12345` (**tukar segera** di menu Akaun)

Untuk tetapkan password admin awal sendiri:

```bash
ADMIN_PASSWORD=rahsia123 npm start
```

Tetapan (environment variable):

| Nama | Default | Guna |
|---|---|---|
| `PORT` | `3000` | Port server |
| `DATA_DIR` | `./data` | Lokasi database (`ajc.db`) dan gambar (`uploads/`) |
| `ADMIN_PASSWORD` | `ajc12345` | Password admin pertama sahaja |
| `SECURE_COOKIE` | (kosong) | Letak `1` bila guna HTTPS |

## Penting: GPS perlukan HTTPS

Pelayar telefon **hanya benarkan GPS di laman HTTPS**. Jadi sistem ini mesti di-host dengan domain HTTPS, contohnya `https://tapak.ajcconstruction.my`. Pilihan mudah:

- **VPS** (DigitalOcean, Vultr, Exabytes, ~RM20–30/bulan) dengan Caddy, yang buat HTTPS automatik:
  ```
  tapak.ajcconstruction.my {
      reverse_proxy localhost:3000
  }
  ```
  Jalankan `npm start` di bawah `pm2` atau `systemd` supaya server hidup semula selepas restart.
- **Railway / Render / Fly.io**: deploy terus dari GitHub, dan HTTPS disediakan. Pastikan ada *persistent volume* untuk folder `data/`, kalau tidak database akan hilang setiap kali deploy.

## Backup

Semua data ada dalam folder `data/`. Salin folder ini setiap hari (contohnya ke Google Drive) sebagai backup.
