# Audit Model DSS Kos Jatinangor

Tanggal audit: 16 November 2026 · Yang diaudit: `model_dss.py`, `prepare_data.py`, `kos_scored.csv`, `dataset_kos_mamikos.xlsx` (tidak ada yang diubah) · Pembanding kontrak: `src/lib/types.ts`, `src/app/api/rank/route.ts`, `src/lib/peringkat.ts`, `src/lib/weights.ts`, `src/lib/explain.ts`, `design/DESIGN.md`.

> Catatan: `src/config/kriteria.ts` **tidak ada**. Config kriteria frontend saat ini ada di `src/lib/types.ts:26-35` (konstanta `KRITERIA`). Audit memakai file itu.

**Legenda bukti** — **[V]** = diverifikasi dengan menjalankan kode/skrip (angkanya keluar dari skrip di `audit/`). **[D]** = dugaan/penilaian, belum dibuktikan. **[?]** = tidak bisa dipastikan dari data yang ada.

---

## Ringkasan

1. **Matematikanya benar.** Bobot rank-sum, min-max, SAW, dan TOPSIS teman cocok dengan implementasi independen di 108 skenario (selisih maks 0,00005 = efek pembulatan 4 desimal) dan lolos 4 golden test hitung-tangan. [V]
2. **Yang belum siap justru data dan kontraknya.** Model bisa dipakai sebagai acuan rumus, tapi data belum cukup untuk UI dan bentuk output belum sesuai API frontend.
3. **Masalah terbesar #1: C3 "Akses layanan" itu sintetis.** Isinya `0,15 + 0,35 × C2`. Setelah min-max nilainya *identik* dengan C2 (korelasi 0,9999993), jadi jarak terhitung dua kali dan "akses layanan" tidak mengukur apa pun yang baru. [V]
4. **Masalah terbesar #2: data tampilan kosong atau dikarang.** `url`, `lat`, `lng` kosong di 360/360 baris, alamat hanya placeholder "Jatinangor, Sumedang", dan foto/kontak/aturan/sekitar TIDAK ADA. Jarak 59 kos (16%) adalah imputasi median 1,1 km, termasuk kos di Rancaekek/Cileunyi. [V]
5. **Masalah terbesar #3: logika ranking dan kontrak.** Rank dihitung dari skor yang sudah dibulatkan, sehingga muncul seri palsu dan rank dobel ("#2, #2" di output `model_dss.py`). Output berupa dict, bukan array. Nama field `tipe_penghuni` bukan `tipe`, dan `jarak_km`/`foto_url`/`url` belum ada. `allow_campur` tidak bisa diakses lewat `rank_kos`. Spearman bisa keluar `NaN`, yang membuat JSON tidak valid. [V]
6. **Rekomendasi integrasi:** porting rumus ke TypeScript (`src/lib/dss/`) dengan golden test. Python dipakai offline untuk menyiapkan data, lalu hasilnya dimuat ke tabel Supabase.

---

## Cara menjalankan ulang audit

```powershell
powershell -ExecutionPolicy Bypass -File "dss-model-kos-jatinangor\audit\run_all.ps1"
```

Skrip ini membuat `audit\.venv` (pandas 3.1.1, numpy 2.5.5, scipy 1.18.1, openpyxl) kalau belum ada. Setelah itu ia menjalankan `model_dss.py` asli dan keempat skrip audit. Output tersimpan di `audit\out\`.

| File | Isi |
|---|---|
| `audit/dss_independen.py` | SAW + TOPSIS (min-max & vektor) + ranking + Spearman, ditulis ulang dari rumus, Python murni (siap di-port ke TS) |
| `audit/golden_test.py` → `audit/golden_test.json` | 4 kasus kecil hitung-tangan (input + output harapan, termasuk pecahan eksak) |
| `audit/bandingkan.py` → `out/bandingkan.txt` | teman vs independen di 108 skenario + kasus tepi + uji `fasilitas_prioritas` |
| `audit/audit_data.py` → `out/data.txt` | kualitas data, reproduksi CSV, kecukupan data untuk UI |
| `audit/sensitivitas.py` → `out/sensitivitas.txt` | 6 urutan bernama + **semua 40.320 urutan** prioritas, 4 skenario |
| `audit/out/kos_scored_rebuild.csv` | hasil `prepare_data.build_kos_scored()` yang ditulis ke `audit/out` (bukan ke file teman) |

### Hasil menjalankan `model_dss.py` (asli) [V]

```
=== USER A (Wajib AC + WC Dalam) | Kandidat: 16 ===
#1 | Kost Wisma Triarga Tipe Executive | Rp 1,000,000 | SAW: 0.872
#2 | Kost Rivita | Rp 1,000,000 | SAW: 0.7871
#3 | Kost Graha Wgm | Rp 1,500,000 | SAW: 0.7551

=== USER B (Wajib WC Dalam, Prioritas WiFi + Air Panas) | Kandidat: 82 ===
#1 | Kost Derumahkoe Tipe B | Rp 850,000 | SAW: 0.7082
#2 | Kost Wisma Triarga Tipe Standart | Rp 900,000 | SAW: 0.7067
#2 | Kost Pondok Haji Agung Tipe A | Rp 1,000,000 | SAW: 0.7067   <- rank dobel
```

Exit code 0. `prepare_data.py` dijalankan ulang ke `audit/out/` dan hasilnya **identik** dengan `kos_scored.csv` (360 × 34). [V]

---

## Tabel temuan

| ID | Tingkat | Lokasi | Masalah | Dampak | Saran perbaikan |
|---|---|---|---|---|---|
| T01 | **KRITIS** | `prepare_data.py:55` | C3 "jarak ke layanan" = `0.15 + 0.35*C2`, sebuah proksi sintetis dan bukan data. Setelah min-max, C3 ≡ C2 (selisih maks 0,0006; Pearson 0,9999993). [V] | Jarak dihitung ganda. Bobot jarak efektif = w(C2) + w(C3), sampai 41,7% kalau C2 dan C3 ditaruh di urutan 1–2. User mengira sedang memprioritaskan "akses layanan", padahal yang naik bobot jarak. `explain.ts` bisa menampilkan "unggul di jarak ke kampus dan akses layanan" untuk hal yang sama [D]. Klaim di laporan jadi tidak jujur. | Pilih salah satu: (a) kumpulkan data asli (jarak ke minimarket/laundry/warung terdekat via OSM/Google Maps), atau (b) hapus C3 dan pakai 7 kriteria (perlu n dinamis, lihat T12). Jangan dipertahankan sebagai "data". |
| T02 | **KRITIS** | `prepare_data.py:72-75`, data | `url`, `lat`, `lng` kosong 360/360. `alamat` diisi placeholder "Jatinangor, Sumedang" untuk semua baris. Foto, kontak, aturan, sekitar, deposit TIDAK ADA di xlsx. [V] | Kartu hasil tanpa foto, tombol "Buka iklan asli" mati, halaman detail sebagian besar kosong. Placeholder alamat bisa terbaca seperti data asli. | Scrape ulang URL listing (id tampaknya id Mamikos [D]) dan foto. Alamat yang tidak ada diisi `null`, bukan placeholder. Lihat tabel kontrak. |
| T03 | **KRITIS** | `prepare_data.py:51-52` | C2 kosong di kedua kampus pada 59 baris (16,4%), lalu diimputasi median 1,1 km tanpa penanda. 51 dari 59 berasal dari batch scraping kedua (nama berakhiran "Jatinangor Sumedang", baris 268–359). Kos "Haffair **Rancaekek**", "Fengsui **Cileunyi** Bandung", dan 3 "Rumah Kontrakan" juga ikut dapat 1,1 km. [V] | Kalau ditampilkan sebagai `jarak_km` ("1,1 km ke kampus"), UI menampilkan angka karangan. Kos yang jauh (Rancaekek) terlihat dekat [D: jarak sebenarnya belum dicek]. | Tambah kolom `jarak_imputasi: bool`. Di UI tampilkan "jarak belum diketahui". Isi jarak asli dari koordinat. Untuk ranking, putuskan apakah tetap pakai median atau kos tanpa jarak dikeluarkan. |
| T04 | SEDANG | `model_dss.py:137-140` | Rank dihitung dari `skor_saw` yang **sudah dibulatkan 4 desimal**, dengan `method="min"`. Di 108 skenario ada 119 grup "seri" yang sebenarnya beda (mis. 0,3533163 vs 0,3533069). Hasilnya rank dobel (#2, #2), dan urutan id beda dengan implementasi independen di 45 skenario (top-3 tetap sama). [V] | Dua kos sama-sama "#2" atau bahkan "#1 Paling cocok". Sementara itu frontend (`peringkat.ts:15-19`) mengasumsikan rank unik 1..n. | Ranking dari skor mentah (bandingkan setelah `round(…, 9)`). Pemutus seri: SAW ↓ → TOPSIS ↓ → harga ↑ → id ↑. Rank unik. Bulatkan hanya untuk tampilan. |
| T05 | SEDANG | `model_dss.py:130-134` | Spearman: kalau n<2 atau skor konstan, model mengisi `rho=1.0, p=0.0` (palsu). Kalau n=2, scipy mengembalikan `p_value = NaN`. [V] | Laporan bisa mengutip "korelasi sempurna" yang sebenarnya tidak terdefinisi. `NaN` lewat `json.dumps` menghasilkan JSON tidak valid untuk `JSON.parse` di browser. | Kembalikan `null` untuk n<3 atau skor konstan. Jangan kirim p-value ke UI. Spearman cukup untuk bab pembahasan. |
| T06 | SEDANG | `model_dss.py:16,28-31,105-110`; FE `peringkat.ts:15-19` | `allow_campur` ada di `filter_kos`, tapi `rank_kos` tidak meneruskannya, sehingga tidak bisa diaktifkan dari API. Aturan "campur" belum diputuskan tim. [V] | Pilihan "putri" saat budget ≤1 jt memberi 61 kos (exact) vs 166 kos (+campur). Ini keputusan produk besar yang belum ada pemiliknya. | Putuskan: apakah putra/putri ikut melihat kos campur? Kalau ya, jadikan default di API dan tulis di laporan sebagai aturan F2. |
| T07 | SEDANG | `model_dss.py:34-38` | F3 diam-diam mengabaikan nama fasilitas yang tidak dikenal: `"kamar mandi dalam"` dan `"wifii"` tidak memfilter apa pun (98 → 98). Kolom non-fasilitas tetap diterima: `["harga"]` → 0 hasil. [V] | Typo dari user/FE menghasilkan hasil yang salah tanpa error. | Whitelist `FITUR_COLS`, dan lempar error untuk nama yang tidak dikenal. (F3 belum ada di kontrak API, lihat T09.) |
| T08 | SEDANG | `model_dss.py:117-124` | `fasilitas_prioritas` **mengganti** definisi C5 per user. Pada contoh User A (wajib = prioritas = AC + WC dalam), C5 jadi konstan (semua 1,0), sehingga bobot C5 22,2% terbuang dan semua SAW naik +0,2222. Kolom apa pun diterima: `["harga"]` membuat C5 = harga (mahal = bagus), dan `["cctv","penjaga"]` membuat C5 ≡ C6 (dihitung ganda). [V] | Definisi kriteria berubah antar-user, jadi skor antar-user tidak bisa dibandingkan dan sulit dijelaskan di laporan sebagai metode SAW baku. Tidak ada di kontrak API. | Rekomendasi: **jangan dipakai** di versi UTS (C5 tetap tetap). Kalau mau dipertahankan, batasi ke kolom C5, keluarkan fasilitas yang sudah wajib (F3), dan dokumentasikan sebagai "C5 terpersonalisasi". |
| T09 | SEDANG | `model_dss.py:143-160` vs `src/lib/types.ts:49-61` | Bentuk output beda: `{total_kandidat, bobot, spearman, hasil:[…]}` vs array `RankResult[]`. Selain itu `tipe_penghuni`→`tipe`, `harga` float, dan `jarak_km`, `foto_url`, `url` belum ada. `rank_topsis` (dibutuhkan detail) tidak dihitung. [V] | Tidak bisa dicolok langsung ke `POST /api/rank`. | Buat lapisan mapping (lihat tabel kontrak). Hitung `rank_topsis` di server. |
| T10 | SEDANG | `prepare_data.py:47`, data | 58 harga berdesimal dengan pola x/12 (mis. 10.750.000/12 = 895.833,33), kemungkinan harga **tahunan** dibagi 12. 72 baris bukan kelipatan Rp 1.000. [V pola; D tafsiran] | Basis harga campur (bulanan asli vs tahunan/12). Harga tahunan per bulan biasanya lebih murah [D], jadi kos itu diuntungkan di C1 dan lolos F1 lebih mudah. | Tanyakan ke teman. Simpan `harga_bulanan` dan `harga_tahunan` terpisah plus `basis_harga`. Untuk tampilan, bulatkan atau tandai "≈ dari harga tahunan". |
| T11 | SEDANG | data, `prepare_data.py:58-59` | Ada 3 "Rumah Kontrakan" (bukan kos), 1 di Rancaekek, dan 1 di Cileunyi. Rumah kontrakan 6×10 = 60 m² menjadi max C4. Untuk campur ≤2 jt, kamar 12 m² dinormalisasi jadi 0,117 (tanpa rumah kontrakan 0,24). [V] | Outlier menekan skor luas semua kos lain di skenario itu. | Keluarkan rumah kontrakan (atau beri tipe tersendiri). Cek lokasi luar Jatinangor. |
| T12 | SEDANG | `model_dss.py:5-7,60-64` | Kriteria di-hardcode: `KRITERIA_COLS`/`COST_COLS` global dan `len == 8` dipaksa. Golden test 3 kriteria: fungsi normalisasi/SAW/TOPSIS teman benar (setelah konstanta modul ditimpa di memori), tapi `hitung_bobot_ranksum` menolak n=3. [V] | Tidak bisa menghapus C3 atau menambah kriteria tanpa mengubah 3 tempat. | Lihat bagian "Kriteria dinamis" di bawah. |
| T13 | SEDANG | `prepare_data.py:51` | C2 = min(jarak Unpad, jarak ITB). 127 baris hanya punya jarak Unpad, 121 hanya ITB, 53 punya keduanya (15 di antaranya lebih dekat ke ITB). [V] FE menulis "Kampus (gerbang utama)" (`bagian-detail.tsx:140`). | "Jarak ke kampus" untuk mahasiswa Unpad bisa berupa jarak ke ITB, dan sumber jaraknya tidak seragam antar-listing [D: kemungkinan jarak dari teks listing Mamikos]. | Putuskan kampus acuan (atau biarkan user memilih). Hitung dari koordinat ke titik gerbang yang sama. Label UI harus sesuai. |
| T14 | SEDANG | `prepare_data.py:64`; FE `types.ts:33` | C7 = rata-rata(termasuk_listrik, bayar_bulanan, bayar_tahunan), di FE diberi label "Pengelolaan / makin tertata". Opsi pembayaran bukan indikator kualitas pengelolaan. `termasuk_listrik` (hanya 27 kos) sebenarnya aspek **biaya**. C7 hanya punya 3 nilai (0,33/0,67/1,0). [V nilai; D penilaian] | 15 kos dengan C7 = 1 dapat bonus penuh. Label UI tidak mencerminkan isi. | Ganti isi C7 dengan data pengelolaan yang benar (mis. ada pengelola/penjaga, kebersihan, rating) atau jadikan "fleksibilitas pembayaran" dengan nama jujur. `termasuk_listrik` lebih tepat jadi koreksi biaya (C1 efektif). |
| T15 | SEDANG | `prepare_data.py:65`; FE `types.ts:34` | C8 = parkir motor, parkir mobil, ruang tamu, ruang jemur → itu **fasilitas bersama**, tapi label FE "Lingkungan / makin nyaman". [V isi; D penilaian] | Nama kriteria di UI dan laporan menyesatkan. | Ganti label jadi "Fasilitas bersama", atau ganti isinya dengan data lingkungan (kebisingan, akses jalan, dsb., kalau ada). |
| T16 | SEDANG | `model_dss.py:44-56` | Min-max dihitung atas kandidat yang lolos filter, sehingga kos terburuk per kriteria selalu 0 dan yang terbaik 1. Dengan n=2 semua skor_kriteria hanya 0/1. Dengan n=1 semuanya 1,0 dan SAW = 1,0. [V] | `skor_kriteria` sebuah kos berubah saat budget diubah. Di UI "skor terendahnya … (0,00)" sering muncul (`explain.ts:36`). Untuk 1 kandidat, semua bar penuh. | Tulis di laporan bahwa skor bersifat relatif. Untuk n ≤ 2 tampilkan pesan khusus. Pertimbangkan normalisasi atas **seluruh dataset** untuk bar tampilan (lihat Verifikasi 2b). |
| T17 | RINGAN | `model_dss.py:21,25` | `budget` None/0/negatif diam-diam melewati F1 (133 putri). `tipe` "" atau None melewati F2. `"perempuan"` → 0 hasil. [V] | Aman selama API memvalidasi (route.ts sudah memvalidasi). | Validasi juga di level fungsi (raise). |
| T18 | RINGAN | `model_dss.py:50-51` | max = min → semua diberi 1,0. [V golden `kolom_konstan`] | Ranking tidak berubah, tapi skor SAW absolut naik +w (mis. hasil User A minimal 0,33). Bar kriteria penuh padahal tidak ada pembeda. | Pilih 0,5 atau keluarkan kriteria dari tampilan. Yang penting konsisten dan tertulis. |
| T19 | RINGAN | `prepare_data.py:12-27` | Parser luas: 3 baris kena heuristik >20 ("3x425"→12,75 m²; "36x6"→21,6 m²), 1 baris gagal ("20x0") → median 12 m². Nilai 12 m² dipakai 25%+ baris (kuartil 1 = 9, median = kuartil 3 = 12). [V] | Kecil. Hasil heuristik masuk akal [D]. | Tandai `luas_imputasi`. Simpan string asli `ukuran_kamar` untuk tampilan (`luas_kamar` di FE). |
| T20 | RINGAN | `prepare_data.py:63` | C6 hanya cctv + penjaga, jadi 3 level (116/119/125 kos). [V] | Kasar. Banyak seri, dan TOPSIS/SAW terdorong oleh lompatan 0 → 0,5 → 1. | Cukup untuk UTS kalau ditulis sebagai keterbatasan. Bisa ditambah "akses kunci/gerbang" kalau data ada. |
| T21 | RINGAN | `model_dss.py:167` | `pd.read_csv("kos_scored.csv")` relatif ke folder kerja. | Gagal kalau dijalankan dari folder lain. | `Path(__file__).parent / "kos_scored.csv"`. |
| T22 | RINGAN | data | 3 nama duplikat dengan id berbeda (Kost Hoop Tipe B/C dengan 2 harga; Pondok Sakinah 1 putri vs campur). Tidak ada duplikat id/baris. [V] | Kemungkinan listing berbeda [D], dan di UI terlihat seperti duplikat. | Tampilkan pembeda (ukuran/harga) atau konfirmasi ke teman. |
| T23 | RINGAN | data | C5 berkorelasi 0,71 dengan C1 (fasilitas lengkap = mahal). [V] | Wajar (trade-off), bukan bug. Bagus untuk bahan pembahasan. | Sebutkan di laporan. |

---

## Hasil verifikasi matematika

### 2a. Bobot rank-sum [V] — **COCOK**

Semua 8! = 40.320 urutan dicek: Σw = 1 persis, dan tiap bobot = 2(n−r+1)/(n(n+1)). Untuk n = 8 hasilnya 2/9, 7/36, 1/6, 5/36, 1/9, 1/12, 1/18, 1/36 (22,2% · 19,4% · 16,7% · 13,9% · 11,1% · 8,3% · 5,6% · 2,8%), sama dengan `src/lib/weights.ts:10-18` di frontend. `weights.ts` sudah memakai n dinamis (`urutan.length`), sedangkan model teman tidak (T12).

### 2b. Normalisasi min-max [V] — **arah benar**

- cost: `(max − x)/(max − min)`, benefit: `(x − min)/(max − min)`, keduanya benar. Hasilnya selalu searah "1 = terbaik", termasuk C1–C3, jadi `skor_kriteria` langsung cocok untuk bar UI.
- max = min → 1,0 untuk semua (T18).
- **Kos terburuk per kriteria selalu dapat 0.** Akibatnya ke SAW:
  - Skor SAW bersifat **relatif terhadap kandidat**: SAW = 1 berarti terbaik di semua kriteria di antara kandidat, bukan "kos sempurna". Skor tidak bisa dibandingkan antar-pencarian (budget/tipe berbeda).
  - Selisih kecil diperbesar: C7 hanya 0,33/0,67/1,0, tapi setelah min-max jadi 0/0,5/1, dan selisih antara kos ber-listrik dan tidak menjadi satu bobot penuh.
  - Outlier menekan sisa kandidat (T11: 60 m²).
  - n = 2 → semua kriteria 0 atau 1 (pemenang ambil semua). n = 1 → semua 1,0.
  - Karena SAW linear, kriteria yang dijadikan 0 tidak "menghukum", hanya tidak menyumbang. Ranking SAW tetap sah. Yang perlu dijelaskan adalah **makna angka absolutnya**.
- Saran laporan: ranking tetap pakai min-max atas kandidat (sesuai metode). Untuk bar per kriteria di halaman detail, bisa dipertimbangkan min-max atas **seluruh dataset** supaya bar sebuah kos tidak berubah-ubah saat budget digeser. Ini keputusan tim, belum ada yang benar/salah.

### 2c. SAW dan TOPSIS [V]

- **SAW**: Σ w_j·r_ij, benar.
- **TOPSIS teman** dihitung di atas matriks **min-max** (bukan normalisasi vektor). Karena tiap kolom (yang bervariasi) punya 0 dan 1, ideal+ = vektor bobot w dan ideal− = 0. Jadi d+ = √Σ w²(1−r)² dan d− = √Σ w²r². Ini **valid sebagai varian** (TOPSIS dengan normalisasi linear max-min) dan **konsisten**: SAW dan TOPSIS memakai matriks yang sama, sehingga perbedaannya murni dari cara agregasi (jumlah berbobot vs jarak ke ideal).
- **TOPSIS standar** (Hwang & Yoon) memakai r = x/√Σx² di atas nilai mentah, lalu ideal+ = max untuk benefit / min untuk cost. Normalisasi vektor menjaga rasio, sehingga kriteria yang variasi relatifnya kecil (harga 0,8–1,2 jt) "terkompres" dan bobot efektifnya bergeser dari bobot rank-sum. Contoh di golden `utama_3x3`: SAW A>B>C, TOPSIS min-max B>A>C, **TOPSIS vektor C>A>B** (kos termahal jadi #1).
- Di data asli (semua 40.320 urutan, 4 skenario): Spearman SAW–TOPSIS min-max median 0,968–0,973 (min 0,793). SAW–TOPSIS vektor median 0,876–0,960 (min **0,340**).
- **Rekomendasi untuk laporan (dipilih): tetap pakai varian teman, TOPSIS di atas matriks min-max**, dan tulis dengan jujur sebagai *"TOPSIS dengan normalisasi min-max (linear)"*, bukan "TOPSIS standar". Alasannya: (1) input kedua metode sama, sehingga Spearman mengukur kestabilan *metode agregasi*, sesuai tujuan "TOPSIS sebagai pembanding"; (2) bobot rank-sum tetap bermakna sama di kedua metode; (3) normalisasi vektor membuat bobot efektif harga bergeser, sehingga sulit dijelaskan ke user. Hasil TOPSIS vektor boleh dicantumkan sebagai uji sensitivitas tambahan di pembahasan, dengan catatan bahwa korelasinya lebih rendah karena normalisasinya juga berbeda. (Referensi perbandingan normalisasi untuk TOPSIS ada di literatur, mis. Chakraborty & Yeh 2009. **Cek ulang sitasinya sebelum dipakai**, belum diverifikasi di audit ini.)

### 2d. Hitung ulang independen [V] — **COCOK**

- `dss_independen.py` ditulis dari rumus (Python murni, tanpa menyalin kode teman).
- 108 skenario: budget {0,8; 1; 1,2; 1,5; 2; 3,5 jt} × {putra, putri, campur} × 6 urutan (default, terbalik, contoh teman, 3 acak seed 42). Jumlah kandidat selalu sama.
  - Selisih maks SAW = TOPSIS = skor_kriteria = **5,0e-5** (teman membulatkan 4 desimal, jadi cocok).
  - Selisih maks Spearman = 3,2e-4 (skenario 3,5 jt putra, acak#3). Penyebabnya: skor yang seharusnya seri berbeda ~1e-16 karena urutan penjumlahan floating point. Setelah skor dibulatkan 12 desimal, rho independen = 0,96093 = rho teman 0,9609. **Pelajaran untuk porting TS: bulatkan skor (mis. 9 desimal) sebelum ranking/Spearman** supaya seri deterministik lintas bahasa.
  - Urutan id beda di 45 skenario. Semuanya terjadi di dalam grup yang SAW-bulatnya sama (T04). Top-3 tidak pernah beda.
- `fasilitas_prioritas` User B diverifikasi ulang: selisih SAW maks 4,9e-5.
- **Golden test** (`audit/golden_test.json`, 4 kasus, toleransi 1e-9) lolos untuk implementasi independen **dan** fungsi teman:

  Kasus `utama_3x3` (bisa dihitung tangan). Kriteria: K1 harga (cost), K2 jarak (cost), K3 fasilitas (benefit). Urutan K1 > K3 > K2 → w = 1/2, 1/3, 1/6.

  | Kos | harga | jarak | fasilitas | r(K1) | r(K2) | r(K3) | SAW | TOPSIS min-max | TOPSIS vektor | Rank |
  |---|---|---|---|---|---|---|---|---|---|---|
  | A | 1.000.000 | 0,5 | 0,5 | 1/2 | 1 | 1/3 | **19/36 = 0,5278** | 0,4892 | 0,4510 | 1 |
  | B | 800.000 | 1,5 | 0,25 | 1 | 0 | 0 | **1/2 = 0,5000** | 0,5729 | 0,3259 | 2 |
  | C | 1.200.000 | 1,0 | 1,0 | 0 | 1/2 | 1 | **5/12 = 0,4167** | 0,4040 | 0,6454 | 3 |

  Contoh SAW A = ½·½ + ⅙·1 + ⅓·⅓ = 9/36 + 6/36 + 4/36 = 19/36.
  Kasus lain: `seri_saw` (tiga kos SAW persis 0,5, dengan salah satunya keluar 0,49999999999999994 di float → pemutus TOPSIS → urutan B, C, A), `kolom_konstan`, `satu_kandidat`.

### 2e. Tie-breaking, 0/1 kandidat, Spearman [V]

| Kasus | Perilaku model teman | Penilaian |
|---|---|---|
| Seri | rank dari skor dibulatkan 4 desimal, `method="min"` (1,2,2,4), lalu diurutkan TOPSIS ↓ | Seri palsu dan rank dobel (T04) |
| 0 kandidat (≤300 rb) | `{"total_kandidat":0, "spearman": None, "hasil": []}` | OK. FE perlu menampilkan halaman "Tidak ada hasil" |
| 1 kandidat (putri ≤500 rb) | semua skor_kriteria 1,0, SAW 1,0, TOPSIS 1,0, spearman `{rho:1.0, p:0.0}` | rho palsu (T05). Bar penuh menyesatkan (T16) |
| 2 kandidat (putri ≤550 rb) | skor_kriteria hanya 0/1, spearman `{rho:1.0, p_value: NaN}` | NaN membuat JSON tidak valid (T05) |
| Spearman umum | `scipy.spearmanr(skor_saw, skor_topsis)` di atas skor mentah, seri dirata-rata | Benar. Tambahkan pembulatan sebelum menghitung (lihat 2d) |
| urutan salah (7 kriteria, duplikat, "c1" huruf kecil, C9) | ditolak `ValueError` | OK |

---

## Audit kriteria dan data

### Kriteria C1–C8

| Kode | Label FE (`types.ts`) | Isi di model (`prepare_data.py`) | Jenis | Sumber | Penilaian |
|---|---|---|---|---|---|
| C1 | Biaya sewa | `harga` | cost | xlsx | OK, tapi basis harga campur (T10). Listrik termasuk/tidak tidak dikoreksi |
| C2 | Jarak ke kampus | min(jarak Unpad, jarak ITB), 59 imputasi median | cost | xlsx | Cukup, tapi kampus acuan tidak seragam (T13) dan imputasi tanpa flag (T03) |
| C3 | Akses layanan | `0.15 + 0.35 × C2` | cost | **sintetis** | **Tidak valid sebagai kriteria.** Salinan C2 (T01) |
| C4 | Luas kamar | p × l dari `ukuran_kamar`, 1 imputasi | benefit | xlsx | OK. Outlier rumah kontrakan (T11) |
| C5 | Fasilitas | rata-rata 8 fitur kamar (WC dalam, kloset duduk, shower, air panas, AC, wifi, jendela, TV) | benefit | xlsx | OK. Semua fitur berbobot sama [D: AC dan TV setara?]. Ditimpa oleh `fasilitas_prioritas` (T08) |
| C6 | Keamanan | rata-rata(cctv, penjaga) | benefit | xlsx | Cukup untuk UTS, tapi kasar (3 level, T20) |
| C7 | Pengelolaan | rata-rata(termasuk_listrik, bayar bulanan, bayar tahunan) | benefit | xlsx | **Tidak cocok dengan label.** Opsi pembayaran ≠ kualitas, dan listrik = aspek biaya (T14) |
| C8 | Lingkungan | rata-rata(parkir motor, parkir mobil, ruang tamu, ruang jemur) | benefit | xlsx | **Label salah.** Isinya fasilitas bersama (T15) |

Korelasi C3–C2 = 0,9999993 (Pearson) / 0,99999 (Spearman). Korelasi lain antar-kriteria ≤ 0,71 (C1–C5), jadi tidak ada duplikasi lain. [V]

### Kualitas data [V kecuali ditandai]

- **Sheet xlsx:** hanya 1 sheet, `Data Kos` (360 baris × 25 kolom). Tidak ada sheet lain yang terlewat.
- **Duplikat:** 0 id, 0 baris penuh, 3 nama (T22).
- **Null:** `jarak_ke_unpad` 180, `jarak_ke_itb` 186, keduanya kosong 59. Kolom lain lengkap. Di CSV: `lat`, `lng`, `url` kosong 360/360, `alamat` satu nilai placeholder.
- **Tipe penghuni:** campur 163, putri 133, putra 64 (label asli "perempuan"/"laki-laki" sudah dipetakan).
- **Harga:** Rp 416.667 – 3.500.000, median 1.000.000. Outlier IQR (> 2.625.000): Kost Pondok Restu 3,5 jt dan Kost Casa Mia Exclusive Single 2,75 jt (campur). 58 baris pola x/12 (T10).
- **Jarak C2:** 0,003 – 2,6 km. Nilai sangat kecil (0,003–0,048 km: Pondok Sakhalin B, Derumahkoe B, Pondok Hemari A/B/C) mungkin benar (persis di depan gerbang) [?].
- **Fitur biner:** semua 0/1, tidak ada nilai aneh. Kloset duduk & jongkok dua-duanya 1 di 34 kos, dua-duanya 0 di 21 kos.
- **Luas:** 4 – 60 m², median 12. Lihat T11, T19.

### Kecukupan data untuk UI (F1 + F2, tanpa F3) [V]

| Budget ≤ | putra | putri | campur | putra + campur | putri + campur |
|---|---|---|---|---|---|
| Rp 500.000 | 3 | **1** | 16 | 19 | 17 |
| Rp 800.000 | 15 | 30 | 63 | 78 | 93 |
| Rp 1.000.000 | 24 | 61 | 105 | 129 | 166 |
| Rp 1.200.000 | 35 | 74 | 123 | 158 | 197 |
| Rp 1.500.000 | 41 | 98 | 144 | 185 | 242 |
| Rp 2.000.000 | 57 | 125 | 157 | 214 | 282 |
| Rp 3.000.000 | 64 | 133 | 162 | 226 | 295 |

- 0 hasil hanya terjadi kalau budget < harga termurah: campur 416.667, putra 500.000, putri 500.000. Slider FE mulai di 500 rb, jadi semua chip (≤800 rb … ≤1,5 jt) aman.
- Ujung bawah rawan: putri ≤500 rb = 1 kos, putri ≤550 rb = 2 kos (kasus tepi T05/T16).
- Putra paling tipis (64 kos total).

---

## Tabel kecocokan kontrak frontend

Sumber kebutuhan: `src/lib/types.ts` (`RankResult`, `KosInfo`, `KosDetailResponse`).

| Field FE | Dipakai di | Status | Sumber / catatan |
|---|---|---|---|
| `id` | rank, detail | **ADA** | `id` (string) |
| `nama` | rank, detail | **ADA** | `nama` |
| `rank` | rank | **ADA, perlu diubah** | Harus unik 1..n dari skor mentah (T04) |
| `harga` | rank | **ADA** | float, perlu dibulatkan untuk tampilan. Basis harga (T10) |
| `jarak_km` | rank, detail | **ADA sebagian** | = C2 mentah, tapi 59 baris imputasi → perlu flag / `null` (T03) |
| `tipe` | rank | **ADA, beda nama** | `tipe_penghuni` → ganti nama jadi `tipe` |
| `foto_url` | rank | **BELUM ADA** | TIDAK ADA di xlsx |
| `url` | rank ("Buka iklan asli") | **BELUM ADA** | kolom ada tapi kosong 360/360 |
| `skor_saw`, `skor_topsis` | rank, detail | **ADA** | Jangan dibulatkan sebelum ranking |
| `skor_kriteria{C1..C8}` | rank, detail | **ADA** | Nilai ternormalisasi 0–1, arah sudah "1 = terbaik" ✔ |
| bentuk respons | `fetchRank` | **BEDA** | model: dict `{total_kandidat, bobot, spearman, hasil}`, FE: array |
| `peringkat.rank_topsis` | detail | **BELUM ADA** | gampang dihitung dari `skor_topsis` |
| `alamat` | detail | **BELUM ADA** | hanya placeholder "Jatinangor, Sumedang". Harus `null`, bukan placeholder |
| `lat`, `lng` | (peta, belum dipakai) | **BELUM ADA** | kosong |
| `luas_kamar` (teks) | detail | **ADA di xlsx, belum di CSV** | `ukuran_kamar` (mis. "3x4") → format "3 × 4 m" |
| `kamar_mandi` dalam/luar | detail | **BISA DITURUNKAN** | `k_mandi_dalam` 1/0 |
| `listrik_termasuk` | detail | **ADA** | `termasuk_listrik` |
| `deposit` | detail | **BELUM ADA** | TIDAK ADA |
| `fasilitas_kamar`, `fasilitas_bersama` | detail | **BISA DITURUNKAN** | 18 kolom biner. Perlu mapping kolom → label Indonesia dan pembagian kamar/bersama (**perlu diputuskan**) |
| `aturan` | detail | **BELUM ADA** | TIDAK ADA |
| `sekitar` | detail | **BELUM ADA** | TIDAK ADA (C3 sintetis bukan pengganti) |
| `foto_urls` | detail | **BELUM ADA** | TIDAK ADA |
| `kontak_nama`, `kontak_wa`, `kontak_telp` | detail | **BELUM ADA** | TIDAK ADA |
| `sumber_url` | detail | **BELUM ADA** | TIDAK ADA. id kemungkinan id Mamikos [D] |
| `diperbarui_at` | detail | **BELUM ADA** | tanggal scraping tidak tercatat |
| kode C1–C8 vs `KRITERIA` FE | prioritas, detail | **KODE COCOK, MAKNA BEDA** | jenis cost/benefit cocok semua. Isi C3, C7, C8 tidak sesuai label FE (T01, T14, T15) |
| `fasilitas_wajib` / `fasilitas_prioritas` | – | **PERLU DIPUTUSKAN** | ada di model, tidak ada di kontrak API dan UI |
| aturan "campur" | filter | **PERLU DIPUTUSKAN** | model: exact match. `allow_campur` tidak terjangkau (T06) |
| Spearman / bobot | – | **OPSIONAL** | tidak ada di kontrak. Cukup untuk laporan, atau kirim di endpoint terpisah |

### Kriteria dinamis — yang perlu diubah (langkah 3)

Di model Python:
1. Ganti `KRITERIA_COLS`/`COST_COLS`/`BENEFIT_COLS` global dengan parameter `kriteria: list[(kode, jenis)]` (dibaca dari config yang sama dengan FE).
2. `hitung_bobot_ranksum(urutan, kriteria)`: validasi `set(urutan) == set(kode)` dan `n = len(kriteria)`, bukan `== 8`.
3. `normalisasi_minmax`, `hitung_saw`, `hitung_topsis`: iterasi `kriteria`, bukan konstanta global. Jenis cost/benefit diambil dari config.
4. `prepare_data.py` hanya menghasilkan kolom yang ada di config.

Di frontend, `weights.ts` sudah dinamis. Yang masih terikat 8 kriteria: union `Kriteria` + `IkonKriteria` di `types.ts:1-14` dan pesan error "C1–C8" di `route.ts:30`. Satu sumber config (`KRITERIA` beserta `jenis`) harus dipakai oleh validasi API dan oleh `src/lib/dss/`. `dss_independen.py` sudah ditulis dengan pola ini (n dinamis), dan golden test-nya pakai 3 kriteria.

---

## Rekomendasi integrasi (langkah 6)

| Opsi | Kelebihan | Kekurangan (untuk Vercel + Supabase, proyek kuliah) |
|---|---|---|
| **(a) Port ke TypeScript di `src/lib/dss/`** | 1 deploy, 1 bahasa. Hitungan ±100 baris aritmetika untuk ≤360 baris, cepat di route handler. Bisa langsung baca `KRITERIA` dari config FE. Golden test menjaga kesetaraan dengan Python | Rumus ada di 2 tempat (Python & TS), sehingga butuh golden test (sudah disiapkan) |
| (b) Service Python terpisah (FastAPI) | Pakai kode teman apa adanya | Host kedua (Render/Railway/Vercel Python). pandas + scipy berat untuk serverless [D: rawan batas ukuran bundle & cold start]. CORS, env, 2 deploy, dan 2 titik gagal saat demo |
| (c) Pra-hitung ke database | Query cepat | Skor **tidak bisa** dipra-hitung: min-max bergantung pada kandidat hasil filter, dan ada 8! = 40.320 urutan × budget × tipe. Yang bisa dipra-hitung hanya nilai mentah C1–C8 |

**Rekomendasi: (a) + bagian yang masuk akal dari (c).**

1. **Offline (Python, milik teman):** `prepare_data.py` diperbaiki (flag imputasi, tanpa C3 sintetis, url/foto) → hasilnya dimuat ke tabel Supabase `kos` (nilai mentah C1..Cn + data tampilan + detail).
2. **Online (TS):** `POST /api/rank` → query Supabase dengan F1/F2 di SQL (`harga <= budget`, `tipe in (...)`) → `src/lib/dss/` menghitung min-max, SAW, TOPSIS, dan ranking → map ke `RankResult[]`. `GET /api/kos/[id]` memakai fungsi yang sama (sudah begitu polanya di `peringkat.ts`).
3. **Test:** baca `audit/golden_test.json` di test TS (toleransi 1e-9). Tambahkan 1 snapshot dari data asli: jalankan `dss_independen.peringkat` untuk 3–4 skenario, simpan top-10 sebagai JSON, lalu TS harus sama.
4. `model_dss.py` tetap jadi **referensi** di laporan (metode + uji Spearman). Sebelum menulis route handler, baca panduan di `node_modules/next/dist/docs/` (sesuai `AGENTS.md`, versi Next.js ini punya perubahan API).

Alasan: proyek kuliah dengan 1 deploy Vercel. Opsi (a) paling sedikit bagian bergeraknya, tidak menambah biaya hosting, dan demo tidak bergantung pada service kedua.

---

## Analisis sensitivitas (langkah 7) [V]

Semua 40.320 urutan prioritas diuji, ditambah 6 urutan bernama per skenario (detail: `audit/out/sensitivitas.txt`).

| Skenario | n | Kos berbeda yang pernah #1 | #1 paling sering | Himpunan top-3 berbeda | #1 SAW = #1 TOPSIS mm | Spearman SAW–TOPSIS mm (min / median) | SAW–TOPSIS vektor (min / median) |
|---|---|---|---|---|---|---|---|
| ≤1 jt, putri | 61 | 14 | Bumi Campernik Tipe A (50,7%) | 143 | 73,0% | 0,862 / 0,968 | 0,709 / 0,916 |
| ≤1 jt, putra | 24 | 4 | Kost Satu Tipe A (93,0%) | 31 | 75,0% | 0,859 / 0,968 | 0,340 / 0,876 |
| ≤1,5 jt, putri | 98 | 11 | Bumi Campernik Tipe A (38,1%) | 140 | 70,9% | 0,898 / 0,973 | 0,652 / 0,941 |
| ≤1,5 jt, campur | 144 | 5 | Puri C4 Deluxe (73,6%) | 50 | 58,0% | 0,793 / 0,973 | 0,771 / 0,960 |

Bahan pembahasan:

- **Urutan prioritas memang mengubah hasil.** Top-3 berubah di hampir semua urutan bernama, dan di putri ada 140+ kombinasi top-3 berbeda. Sistem responsif terhadap preferensi, jadi ini bukan bug.
- **Di putra dan campur ada kos "dominan".** Kost Satu Tipe A (Rp 600 rb) jadi #1 di 93% urutan, bahkan 98% saat harga ditaruh paling akhir. Penyebabnya: di antara kandidat putra ≤1 jt ia bernilai maksimal di C4 (12 m²), C6, dan C8 (C6/C8 adalah kriteria diskret 3–5 level), C7-nya di tengah, dan harganya murah. Kelemahannya hanya di C5 (0,25). Ini contoh bagaimana kriteria kasar plus min-max memberi lompatan skor besar (T14, T20).
- **SAW vs TOPSIS (varian min-max) sangat konsisten:** median ρ ≈ 0,97, dan p5 ≥ 0,89 di semua skenario. Tetapi #1-nya hanya sama di 58–75% urutan, dan overlap top-3 di urutan bernama biasanya 2/3 (kadang 1/3, mis. campur default). Kesimpulan yang jujur untuk laporan: urutan keseluruhan sangat mirip, tapi peringkat teratas sensitif terhadap metode. Itulah alasan TOPSIS ditampilkan sebagai pembanding di halaman detail.
- Korelasi tinggi sebagian karena kedua metode memakai matriks min-max yang sama. Dengan TOPSIS vektor, ρ bisa turun sampai 0,34 (putra) [V].

Contoh urutan default (C1..C8), ≤1 jt putri: top-3 SAW = Derumahkoe Tipe B, Pondok Annisa UNPAD Tipe A, Pondok Dara I Tipe B. Top-3 TOPSIS mm = Pondok Kaca II Tipe B, Pondok Annisa UNPAD Tipe A, Pondok Dara I Tipe B (overlap 2/3).

---

## Pertanyaan untuk teman pembuat model (siap kirim)

1. C3 "jarak ke layanan" dihitung `0,15 + 0,35 × C2`. Angka 0,15 dan 0,35 dari mana? Ada data asli jarak ke minimarket/laundry/warung? Kalau tidak ada, kamu setuju C3 dihapus (7 kriteria) atau mau diisi data asli?
2. Harga yang berdesimal (mis. 895.833,33 = 10.750.000/12, 58 baris, kebanyakan nama berakhiran "Jatinangor Sumedang"): itu harga tahunan dibagi 12? Kalau iya, ada harga bulanan aslinya?
3. Kolom `jarak_ke_unpad` / `jarak_ke_itb` diambil dari mana (teks listing Mamikos? Google Maps?) dan diukur ke titik mana (gerbang mana)? Kenapa kebanyakan baris hanya punya salah satu?
4. 59 kos tanpa jarak sama sekali diisi median 1,1 km, termasuk "Kost Haffair Rancaekek" dan "Kost Fengsui Tipe A Cileunyi Bandung". Bisa dicari jarak aslinya, atau kos itu dikeluarkan?
5. "Rumah Kontrakan Sweethome Fasyiha / Bu Eli / Cukup Besar" itu sengaja dimasukkan? Untuk kos, 60 m² merusak normalisasi luas.
6. `id` itu id listing Mamikos? Masih punya URL listing, foto, nama/nomor pemilik, aturan kos, dan alamat dari hasil scraping? (Di CSV, `url`/`lat`/`lng` kosong semua.)
7. C7 = listrik termasuk + bisa bayar bulanan + bisa bayar tahunan. Maksudnya mengukur apa? Di UI labelnya "Pengelolaan". Bagaimana kalau listrik dipindah jadi koreksi biaya dan C7 diganti/diberi nama jujur?
8. C8 isinya parkir + ruang tamu + ruang jemur, sedangkan label UI "Lingkungan". Boleh diganti jadi "Fasilitas bersama"?
9. `fasilitas_wajib` dan `fasilitas_prioritas` tidak ada di desain UI/API. Perlu dipertahankan untuk UTS? (Catatan: kalau prioritas = wajib, C5 jadi konstan dan bobotnya terbuang.)
10. Kos "campur": kalau user pilih putri, apakah kos campur ikut ditampilkan? `allow_campur` ada di `filter_kos`, tapi `rank_kos` tidak meneruskannya.
11. Untuk laporan, TOPSIS-nya mau ditulis sebagai "TOPSIS dengan normalisasi min-max" (seperti di kode)? Setuju rank tidak dihitung dari skor yang dibulatkan, dengan pemutus seri TOPSIS → harga → id?
12. Kapan data di-scrape? (Untuk `diperbarui_at` dan bagian keterbatasan di laporan.)

---

## Checklist yang masih kurang (urut prioritas)

1. [ ] **Putuskan nasib C3**: hapus atau ganti dengan data asli. Kalau dihapus, jadikan kriteria dinamis (model + `types.ts` + validasi route).
2. [ ] **Data tampilan**: `url` listing, `foto_url`/`foto_urls`, alamat asli (atau `null`). Tanpa ini, kartu hasil dan "Buka iklan asli" tidak bisa jalan.
3. [ ] **Flag imputasi** (`jarak_imputasi`, `luas_imputasi`) dan tampilkan "belum diketahui" di UI. Bereskan 59 jarak kosong.
4. [ ] **Bersihkan data**: keluarkan rumah kontrakan dan lokasi luar Jatinangor. Konfirmasi basis harga (tahunan/12).
5. [ ] **Putuskan aturan "campur"** dan tulis sebagai F2 di laporan.
6. [ ] **Ranking deterministik**: tanpa pembulatan sebelum rank, pemutus seri SAW → TOPSIS → harga → id, rank unik.
7. [ ] **Port ke `src/lib/dss/` (TS)** + test dengan `audit/golden_test.json`. Ganti `peringkat.ts`/mock dengan Supabase.
8. [ ] **Mapping output** ke `RankResult[]` (`tipe`, `jarak_km`, `rank_topsis`). Spearman `null` untuk n<3, tidak ada NaN.
9. [ ] **Benahi label/isi C7 dan C8** supaya sama antara data, UI, dan laporan.
10. [ ] **Putuskan F3 / `fasilitas_prioritas`**: buang untuk UTS, atau desain UI + validasi whitelist.
11. [ ] **Data detail** (kontak, aturan, sekitar, deposit, `diperbarui_at`). Kalau tidak ada, pastikan UI rapi dengan "Belum ada data …" (sudah ada di `bagian-detail.tsx`).
12. [ ] **Laporan**: tulis TOPSIS sebagai varian min-max, sifat skor relatif (min-max atas kandidat), keterbatasan C6 dan imputasi, plus tabel sensitivitas di atas.
13. [ ] Kecil: path CSV relatif (`model_dss.py:167`), validasi budget/tipe di level fungsi, nama duplikat.
