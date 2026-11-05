# Laporan Audit: AJC Sistem Tapak

**Tarikh:** 5 November 2026 · **Versi:** mod demo (GitHub Pages + data dalam peranti)

## Ringkasan

| Kategori (Lighthouse, telefon) | Sebelum | Selepas |
|---|---|---|
| Prestasi | 84 | **90** |
| Aksesibiliti | 100\* | **100** |
| Amalan terbaik | 100 | **100** |
| SEO | 100 | **100** |

\* Lighthouse hanya menyemak skrin log masuk. Audit axe-core pada **12 skrin** menjumpai **77 isu** sebelum pembetulan, dan **0** selepas.

| Semakan telefon | iPhone SE (375×667) | Galaxy A (360×780) | iPhone 15 Pro Max (430×932) |
|---|---|---|---|
| Skrol ke tepi | Tiada | Tiada | Tiada |
| Butang Punch kelihatan tanpa skrol | Ya | Ya | Ya |
| Sasaran sentuh < 32px | 0 (asal 14) | 0 (asal 14) | 0 (asal 14) |
| Ralat JavaScript | 0 | 0 | 0 |

## Kaedah

1. **axe-core 4.10** (WCAG 2.1 AA + amalan terbaik) dijalankan pada setiap skrin dan borang: log masuk, punch, dashboard, senarai projek, butiran projek, ringkasan, borang ukuran, borang projek, rekod, staff & lokasi, borang lokasi dan akaun.
2. **Lighthouse 12** dalam mod telefon (perlahan 4G, CPU 4× perlahan).
3. **Ujian automatik pada 3 saiz telefon**: limpahan skrin, saiz sasaran sentuh, dan sama ada butang Punch kelihatan tanpa skrol.
4. **Ujian fungsi hujung-ke-hujung** dengan GPS dan kamera simulasi:
   - punch di pejabat (lulus), di luar kawasan (ditolak), dengan VPN (ditolak), GPS dimatikan (ditolak), semakan rangkaian gagal (ditolak), dan selfie dibatalkan (tiada rekod)
   - server menolak punch tanpa selfie
   - tambah ukuran dengan gambar, muat turun CSV, kongsi WhatsApp
5. **Semakan kod** untuk keselamatan dan bug.

## Dapatan & pembetulan

### Aksesibiliti & kebolehbacaan (dibetulkan)
| # | Isu | Kesan | Pembetulan |
|---|---|---|---|
| 1 | Kontras teks kelabu 4.2:1, dan pil "Siap" hijau 3.1:1 | Sukar dibaca di bawah matahari di tapak | Warna kelabu, hijau, merah dan oren digelapkan hingga ≥ 4.5:1 |
| 2 | Butang ikon "Tambah staff" & "CSV" tanpa nama di telefon | Pembaca skrin sebut "butang" sahaja | Tambah `aria-label` |
| 3 | Bar status projek guna `aria-label` tanpa `role` | ARIA tidak sah | Tambah `role="img"` |
| 4 | Susunan tajuk melompat (h1 → h3), skrin Punch & Akaun tiada h1 | Navigasi pembaca skrin mengelirukan | Struktur tajuk diperbetul pada semua skrin |
| 5 | Skrin log masuk tiada landmark `main` | Navigasi papan kekunci / pembaca skrin | Borang log masuk dalam `<main>` |
| 6 | Teks ringkasan WhatsApp boleh diskrol tetapi tidak boleh difokus | Pengguna papan kekunci tidak dapat skrol | `tabindex="0"` |
| 7 | Butang status projek setinggi 25px, pautan "Semua projek" 22px | Susah ditekan dengan jari | Semua sasaran sentuh ≥ 34px |
| 8 | Butang WhatsApp: teks putih atas hijau terang (3.4:1) | Kontras rendah | Hijau digelapkan |

### Telefon (dibetulkan / ditambah)
| # | Isu | Pembetulan |
|---|---|---|
| 9 | iPhone zoom masuk bila tekan medan input (fon 15px) | Fon input 16px di telefon |
| 10 | Bottom nav & butang + menutup medan bila papan kekunci dibuka | Disembunyikan secara automatik bila papan kekunci dibuka |
| 11 | Medan tarikh di Rekod terkeluar dari kad pada skrin 375px | Grid 2 lajur yang sesuai dengan skrin |
| 12 | Butang tindakan projek (6 butang) berbalut 2 baris | Grid ikon gaya app di telefon |
| 13 | Kad Punch terlalu tinggi pada skrin rendah | Versi padat untuk skrin ≤ 760px tinggi |
| 14 | Borang ukuran: Enter menghantar borang separuh siap | Enter beralih lokasi → lebar → tinggi → tutup papan kekunci |
| 15 | Bottom sheet hanya boleh ditutup dengan butang ✕ | Boleh diseret ke bawah untuk tutup |
| 16 | Staff tidak tahu sama ada dalam kawasan sebelum tekan Punch | Status lokasi langsung ("Anda di Pejabat AJC · 31 m") dan chip pejabat aktif |
| 17 | Rekod admin panjang dan sukar diimbas | Dikumpul ikut hari dengan tajuk melekat; selfie sebagai avatar |

### Prestasi (dibetulkan)
| # | Isu | Pembetulan |
|---|---|---|
| 18 | `logo.png` 958px / 139 KB untuk paparan 240px | Saiz dikecilkan ke 480px / 48 KB |
| 19 | Imej tanpa saiz (lompatan susun atur) | `width` / `height` pada semua imej; CLS = 0 |
| 20 | Nisbah aspek logo log masuk salah | Diperbetul |

> Lighthouse melaporkan "tiada mampatan teks" kerana diuji pada server tempatan. GitHub Pages memampatkan fail secara automatik (gzip/brotli), jadi prestasi sebenar lebih baik daripada skor di atas.

### PWA & jenama (ditambah)
- Ikon app profesional: tanda AJC putih atas gradien biru AJC dengan grid blueprint.
  - `icon-192`, `icon-512`
  - ikon **maskable** untuk Android (bentuk bulat / squircle)
  - `apple-touch-icon` 180px untuk iPhone
  - favicon
- **Animasi splash** gaya app native, dipaparkan sekali setiap kali app dibuka:
  - logo AJC muncul dari kiri ke kanan
  - garisan pita ukur dengan tanda skala
  - tulisan "Sistem Tapak"
  - Splash menghormati tetapan "kurangkan gerakan".
- Manifest dikemas kini: `background_color` navy supaya splash Android sepadan dengan splash app. Ada juga **shortcut** (tekan lama ikon → Punch / Projek / Rekod), orientasi potret dan kategori.
- Banner "Pasang AJC Tapak" pada skrin Punch, dengan arahan khas untuk iPhone (Safari) dan Android (Chrome).

### Lain-lain
- "Rumah Owner" ditukar kepada **"Rumah"**.

## Risiko yang masih ada (perlu backend sebenar)

Mod demo menyimpan data dalam browser setiap peranti. Perkara di bawah **tidak boleh** diselesaikan sepenuhnya tanpa server, dan akan selesai bila disambung ke Supabase:

| Tahap | Risiko | Penyelesaian dengan Supabase |
|---|---|---|
| 🔴 Tinggi | **Data tidak dikongsi.** Punch staff di telefon mereka tidak sampai ke telefon admin. | Database pusat |
| 🔴 Tinggi | **Masa punch ikut jam telefon.** Staff boleh tukar jam telefon. | Masa dicop oleh server (`now()`) |
| 🔴 Tinggi | **Semakan radius, VPN & selfie dibuat di browser.** Staff yang pandai teknikal boleh mengelaknya. | Semakan diulang di server; VPN disemak ikut IP permintaan |
| 🟠 Sederhana | **Kata laluan demo** disimpan dengan hash ringkas dalam peranti. | Supabase Auth / bcrypt di server |
| 🟠 Sederhana | **Storan peranti ~5 MB.** Gambar dan selfie akan memenuhkannya selepas beberapa ratus rekod. | Supabase Storage |
| 🟡 Rendah | **Aplikasi web tidak dapat mengesan app "fake GPS".** | Selfie bercop masa & lokasi membantu semakan visual. Perlindungan penuh perlukan app native. |
| 🟡 Rendah | **Servis semakan VPN (ipapi.is) percuma terhad ~1,000 semakan sehari.** Cukup untuk syarikat kecil. | Pelan berbayar atau semakan di server |
| 🟡 Rendah | **Tiada Content-Security-Policy**, kerana GitHub Pages tidak boleh set header. | Hos dengan header keselamatan (Vercel / Cloudflare Pages) |

## Semakan keselamatan kod (lulus)
- Semua data pengguna dipaparkan melalui `esc()` (tiada XSS). Diperiksa pada setiap templat.
- Gambar hanya diterima sebagai `data:image/jpeg|png|webp`. Selfie dihadkan ke 400 KB.
- Pautan luar menggunakan `rel="noopener"`.
- Peranan admin disemak di lapisan data, bukan hanya di UI. Staff tidak boleh padam projek atau lihat rekod staff lain.

## Cadangan seterusnya (ikut keutamaan)
1. **Sambung Supabase.** Ini menyelesaikan semua risiko 🔴 di atas.
2. **Notifikasi push** kepada admin bila staff punch in lewat, atau tidak punch in sebelum 9:00 pagi.
3. **Mod gelap** untuk kegunaan waktu malam.
4. **Sebut harga automatik** daripada ukuran (harga per m² ikut jenis kaca dan frame).
