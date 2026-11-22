# Desain Frontend — CariKos (DSS Kos Jatinangor)

Nama aplikasi dibaca dari `src/config/site.ts`; logo sementara (kotak biru `#1D5FD1` + wordmark) hanya di `src/components/ui/logo.tsx`. Placeholder nama di mockup 09/10 diganti nama ini.

Acuan visual untuk semua halaman. File di `design/mockups/` adalah sumber mockup (format Claude Design `.dc.html`): baca markup + inline style-nya sebagai referensi layout, ukuran, dan warna. **Jangan** salin runtime-nya (`support.js`, `<x-dc>`, `{{c.xxx}}`, `<sc-for>`); terjemahkan ke komponen React + Tailwind. Nilai `{{c.xxx}}` = token warna di bawah (palet "Laut").

Gaya: **marketplace minimalis + efek kaca (glassmorphism)**. Foto kos jadi pusat. Tanpa clay/3D, tanpa bola dekoratif, tanpa ungu.

## Token warna (palet Laut — default)

| Token | Nilai | Dipakai untuk |
|---|---|---|
| base | `#F3F6FB` | latar halaman |
| ink | `#1A1D24` | teks utama |
| muted | `#4E5463` | teks sekunder |
| line | `#E3E7EE` | garis, track bar |
| accent | `#1D5FD1` | tombol utama, skor #1, bar skor |
| accentInk | `#1A55BC` | teks berwarna aksen |
| soft | `#E3ECFD` | latar chip/tile terpilih |
| glow | `rgba(29,95,209,.28)` | bayangan tombol utama |
| glass | `rgba(255,255,255,.55)` | kartu kaca |
| glassStrong | `rgba(255,255,255,.78)` | badge di atas foto, bottom bar |
| gBorder | `rgba(255,255,255,.9)` | border kaca |
| gShadow | `rgba(30,45,90,.10)` | bayangan kartu kaca |

Latar halaman: `base` + 3 radial-gradient biru lembut (`#B7D0FF`, `#C6EDFF`, `#DDE9FF`, posisi beda tiap halaman, ~40–45% radius).

Palet alternatif (opsional, belum final): Mint `#0E7C66`, Peach `#C0391D`, Sakura `#C2316E` — lihat blok `P` di script mockup.

## Tipografi
- Font: **Plus Jakarta Sans** (400–800).
- Judul halaman 26–30px / 800 / letter-spacing −0.02em. Judul kartu 17px / 800. Body 13–15px. Label kecil 11–12px.
- Format angka gaya Indonesia: `Rp 1.050.000`, skor `0,82`, jarak `0,3 km`, bobot `22,2%`.

## Komponen
- **Kaca (.glass)**: bg `glass`, `backdrop-filter: blur(20px) saturate(160%)`, border 1px `gBorder`, shadow `0 8px 24px gShadow`, radius 20–24px.
- **Tombol utama**: bg `accent`, teks putih 15–16px/700, tinggi 50–52px, radius 16px, shadow `0 8px 20px glow`. Datar (tanpa efek timbul).
- **Tombol sekunder**: bg `glassStrong`, border `line`, teks ink.
- **Chip**: pill radius 999px tinggi 40px; terpilih = border 1.5px accent + bg soft + teks accentInk.
- **Foto**: rasio lebar, radius 16–20px; placeholder = gradasi abu `#E3E6EA → #CDD3DA` + ikon gambar + teks "foto kos".
- **Badge di atas foto**: pill kaca (`glassStrong` + blur 12px) berisi "#1 Paling cocok", "#2", skor, "1/5". Badge skor #1 = bg accent, teks putih.
- **Bar skor**: track 8px `line`, isi `accent` (nilai < 0,6 pakai `muted`), radius 4px.
- **Bottom bar sticky**: bg `glassStrong` + blur, border-top `gBorder`, padding 14–20px.
- **Search pill (Hasil)**: pill kaca tinggi 52px berisi ringkasan filter + tombol ikon filter di kanan; klik → /filter.
- Ikon: lucide, stroke 2. Touch target minimal 44px.

## Halaman (mobile 390px; konten max-width ±480px di tengah)
1. **Home** (`00-home.html`): logo (komponen `Logo`) + link Tentang; hero judul + subjudul; kartu kaca berisi 2 field ringkas (Budget maks, Tipe) + tombol "Mulai cari kos" → /filter; "Cara kerjanya" 3 tile kaca bernomor; "Kos di data kami" carousel horizontal kartu foto.
2. **Filter** (`01-filter.html`): back + "Langkah 1 dari 3" + progress bar 4px (50%); judul "Mulai dari batasmu"; kartu kaca budget (nilai besar, slider 500rb–3jt step 100rb, chip cepat ≤800rb/≤1jt/≤1,2jt/≤1,5jt); 3 tile tipe penghuni (Putra/Putri/Campur, ikon); bottom bar "14 kos cocok" + tombol "Lanjut ke prioritas".
3. **Rakit kriteria / prioritas** — DIGANTIKAN oleh sistem lego (mockup `09-kriteria-lego-desktop.html` dan `10-kriteria-lego-mobile.html`; `02-prioritas.html` hanya arsip). Katalog piece per kategori di `src/config/kriteria.ts` (hanya yang datanya tersedia yang tampil), user memasang 1–12 piece dan mengurutkannya.
   - Desktop (09): chip kategori sticky (badge jumlah terpasang, aktif ikut gulir) + kartu 3 kolom (klik = pasang/lepas, seret ke rak = pasang); rak "Rakitanmu" sticky (bar segmen bobot, daftar bernomor + bobot %, naik/turun/×, seret untuk urut, seret ke katalog = lepas, garis biru penanda posisi), peringatan bila > 8, CTA "Lihat peringkat dengan N kriteria".
   - Mobile (10): "Langkah 2 dari 3", daftar prioritas (tahan & geser), dock bawah ("Buka lemari kriteria" + "Lihat peringkat"), lemari = bottom sheet hampir setinggi layar dengan chip kategori dan tombol tambah/centang 44px.
4. **Hasil** (`03-hasil.html`): search pill kaca; "14 kos cocok" + "Urut skor SAW"; kartu #1 foto besar (196px) dengan badge; grid 2 kolom #2–#3; baris ringkas #4 dst.; tombol mengambang kaca "Ubah kriteria" → /prioritas; catatan netral "N kos disembunyikan karena datanya belum ada" bila ada.
5. **Detail** (`04-detail.html`): foto galeri 220px + tombol back kaca + counter; kartu kaca overlap (−20px) berisi badge "#1 dari 14" + tipe, nama, jarak, 2 tile (Skor SAW, Pembanding TOPSIS), bar skor tiap kriteria terpasang (urut prioritas user); kotak soft "Kenapa peringkat 1?" (dibangun dari kriteria terpasang, dihasilkan otomatis); bottom bar harga + "Buka iklan asli".
6. **Tidak ada hasil** (`05-kosong.html`): search pill; kartu kaca tengah: ikon rumah di lingkaran soft, "Belum ada kos yang cocok", penjelasan, tombol "Naikkan budget ke Rp …" + "Ganti tipe ke Campur".
7. **Desktop hasil** (`06-desktop-hasil.html`): navbar kaca sticky dengan search pill 3 segmen (Tipe | Budget | Prioritas) + tombol cari; grid auto-fill min 260px, kartu #1 span 2 kolom (foto 300px), lainnya foto 190px.

## Aturan
- TOPSIS hanya tampil di halaman Detail.
- Tanpa peta.
- Semua nama kos & angka di mockup = DATA CONTOH.
- State filter lewat query params URL: `?budget=…&tipe=…` (pendek). Kriteria terpasang (urut prioritas) disimpan di sessionStorage per tab (`src/lib/kriteria-tersimpan.ts`): bertahan saat refresh/pindah halaman, hilang saat browser ditutup. Link lama dengan `&kriteria=a,b,c` tetap dibaca dan menang atas rakitan sesi.
