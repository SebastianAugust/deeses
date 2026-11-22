# Audit Ulang (v2) Model DSS Kos Jatinangor

Tanggal audit: 22 November 2026 · Pembanding: `audit/AUDIT.md` (16 November 2026, temuan T01–T23).
Yang diaudit (baca-saja, tidak ada yang diubah): `model_dss.py`, `prepare_data.py`, `kos_scored.csv` (commit `8ca2b29`), `../dataset/dataset_kos_v1.csv` (commit `b3f8508`), plus sisi aplikasi (`src/config/kriteria.ts`, `src/lib/dss/*`, `tests/*`) sebagai pembanding.
Semua keluaran mentah ada di `audit/out_v2/`, skrip pembuatnya di `audit/out_v2/skrip/`. Tidak ada git commit/push. `.env` tidak dibaca.

**Legenda bukti.** **[V]** = diverifikasi dengan menjalankan kode pada file saat ini (nama file keluaran disebut). **[D]** = dugaan/penilaian, belum terbukti. **[TV]** = tidak terverifikasi (alasan ditulis).

---

## 1. Ringkasan eksekutif

1. **Logika model sudah jauh lebih baik dan layak dijadikan acuan.** Kriteria dinamis (n = jumlah terpasang, bobot rank-sum benar untuk n = 1, 2, 3, 4, 8, 12), rank unik, Spearman `null`, JSON tanpa NaN, whitelist F3, `allow_campur` diteruskan, `fasilitas_prioritas` dibuang. Pada 144 skenario acak, skor SAW/TOPSIS model sama dengan mesin independen (selisih maks 2,2e-16). [V `uji_model_v2.txt`]
2. **Data jarak belum siap dan paling berbahaya.** `jarak_unpad_km`/`jarak_itb_km` hasil OSRM rute mobil: median jarak Unpad 4,85 km padahal garis lurus 1,21 km (rasio median 3,6×, maks 13,7×). Korelasi jarak-Unpad dengan jarak-ITB antar kos −0,19 padahal kedua kampus hanya 0,65 km. [V N01]
3. **Koordinat ganda:** 90 pasang kos berbeda nama (180 dari 357 baris) memakai lat/lng identik sampai 7 desimal. Satu anggota tiap pasangan hampir pasti salah, dan semua jarak dihitung dari koordinat ini. [V N02]
4. **Luas kamar:** 54,9% baris bernilai tepat 12,0 m²; 59 di antaranya bertentangan dengan teks `ukuran_kamar` di xlsx lama (mis. "3x3" menjadi 12), tanpa flag imputasi. [V N03]
5. **Akibat untuk web:** rakitan awal aplikasi (`harga, jarak_kampus, luas, cctv`) memuat dua kriteria yang datanya belum layak. Kriteria biner (AC, Wi-Fi, dst.) dan harga sudah layak dipakai dengan catatan.
6. **Sisa masalah model kecil tapi nyata:** rank diurutkan dari skor float mentah tanpa pembulatan 9 desimal, sehingga model **gagal golden test `seri_saw` milik audit lama** (urutan B,A,C, harusnya B,C,A) dan berbeda urutan dari mesin independen/TS di 16 dari 144 skenario. Pemutus id di model numerik, di TS string (beda di 32 dari 144 skenario). [V N05, N06]
7. **Skrip audit lama rusak** (4 dari 5 gagal) karena API model berubah, xlsx dihapus, dan kolom C3/C5–C8 kosong. Itu temuan, bukan bug skrip. Tes TypeScript: 69 lulus, 2 gagal karena data berubah (360→357 baris, kolom jarak kini ada). [V]
8. **Golden fixture baru siap:** `audit/out_v2/golden_dinamis.json` (11 skenario, n = 1…12), dibuat dari mesin independen Decimal; cocok 11/11 dengan `model_dss.py`.
9. **Penghambat integrasi:** (a) benahi jarak dan koordinat, (b) bersihkan/flag luas, (c) putuskan pemutus id dan pembulatan, (d) tambah kolom Supabase dan hapus 3 id kontrakan lama. Daftar tugas di bagian 7.

---

## 2. Status T01–T23

| ID | Status | Bukti |
|---|---|---|
| T01 C3 sintetis | **SELESAI** | `prepare_data.py:82` `C3 = None`; `kos_scored.csv` C3 kosong 357/357; C3 tidak ada di `KATALOG_KRITERIA` (`model_dss.py:7-33`). Tidak diganti data asli, kolom kosong masih dikirim (N14). |
| T02 url/lat/lng/alamat/foto | **SEBAGIAN** | lat/lng terisi 357/357, semua di kotak Jatinangor (N02 untuk duplikat). `alamat` NULL 357/357 (placeholder dihapus, jujur). Kolom `url` dihapus dari CSV; `url_gambar1` NULL 357/357; foto, kontak, deposit, minimarket, pasar tidak ada. [V `data_v2.txt`] |
| T03 imputasi jarak, luar Jatinangor | **SEBAGIAN** | Imputasi median hilang (jarak null 0; `C2 == 1,1` 0 baris). Tetapi diganti jarak OSRM yang bermasalah (N01, N02), tanpa flag/metode. "Kost Haffair **Rancaekek**" dan "Kost Fengsui Tipe A **Cileunyi** Bandung" masih ada. [V] |
| T04 rank dari skor mentah | **SEBAGIAN** | Rank unik 1..n, pemutus SAW↓ TOPSIS↓ harga↑ id↑ (`model_dss.py:176-184`), 144/144 rank unik. Tetapi tanpa `round(…,9)`: gagal golden `seri_saw` lama; 16/144 skenario urutan beda dari mesin independen (N05). [V] |
| T05 Spearman null/NaN | **SELESAI** | `model_dss.py:169-174`: null untuk 0, 1, 2 kandidat dan 5 kos identik; 144/144 hasil lolos `json.dumps(allow_nan=False)`. Sisa selisih tie di N05. [V] |
| T06 `allow_campur` | **SELESAI** (kode) | Diteruskan `model_dss.py:140,143-149`: putri ≤1 jt 61 → 166 kos. Keputusan produk belum final (`IKUTKAN_CAMPUR_DEFAULT=false`, `src/config/kriteria.ts:229`). [V] |
| T07 whitelist F3 | **SELESAI** | `model_dss.py:35-40,74-77`: `'kamar mandi dalam'`, `'wifii'`, `'harga'` → `ValueError`. [V] |
| T08 `fasilitas_prioritas` | **SELESAI** | Dibuang; string itu tidak ada di `model_dss.py`, signature `rank_kos` tanpa parameter itu. [V] |
| T09 bentuk output vs kontrak | **TIDAK RELEVAN LAGI** (sebagian) | Kontrak kini dipenuhi `src/lib/dss` (TS). Output Python masih dict: `tipe_penghuni`, tanpa `rank_topsis`, `jarak_km`, `foto_url`, `url`, `kriteria_dipakai`, `tanpa_data_per_kriteria`. Hanya masalah bila Python jadi engine. [V] |
| T10 harga pola x/12 | **BELUM** | 56 baris desimal x/12 (mis. 833333,33). Tak ada `harga_bulanan`, `harga_tahunan`, `basis_harga`. Komentar `prepare_data.py:60` "Harga bulanan langsung" menyesatkan (N11). [V] |
| T11 Rumah Kontrakan | **SELESAI** | `prepare_data.py:41` mengeluarkannya; 357 baris, 0 nama "kontrakan", luas maks 30. 3 id lama masih ada di Supabase (N08). [V] |
| T12 kriteria dinamis | **SELESAI** | Bobot untuk n = 1…12 benar, `rank_kos` jalan dengan subset 1, 2, 4, 12 kriteria. Catatan: jenis cost/benefit dari dict global dan ada alias ganda (N07). [V] |
| T13 kampus acuan | **SEBAGIAN** | Kini ada `jarak_unpad_km` dan `jarak_itb_km` terpisah (baik). Tetapi `C2 = min(...)` dan 80,1% baris C2-nya jarak ITB. Titik acuan hanya konstanta (`prepare_data.py:8-9`), bukan gerbang, tidak terverifikasi; profil rute `driving`. [V] |
| T14 C7 | **SELESAI** | C7 NULL 357/357; `termasuk_listrik`, `pembayaran_*` tersedia sebagai kolom mentah. |
| T15 C8 | **SELESAI** | C8 NULL 357/357; fasilitas bersama tersedia sebagai kolom mentah. |
| T16 min-max relatif | **BELUM** | Perilaku metode tak berubah (`model_dss.py:98-111`); skenario `n02_jarak_luas` tetap 0/1. Hanya perlu dokumentasi/UI. |
| T17 validasi budget/tipe | **SELESAI** | `model_dss.py:49-60`: budget None/0/−5 dan tipe ""/None/"xyz" → `ValueError`; "perempuan"→putri, "Putri " diterima. [V] |
| T18 kolom konstan = 1,0 | **BELUM** | `model_dss.py:105-106` tetap 1,0 (konsisten dengan TS); skenario `n03_kolom_konstan` ada di golden baru. |
| T19 luas: parser/imputasi | **REGRESI** | Parser dan teks `ukuran_kamar` hilang (xlsx dihapus di `8ca2b29`). 196/357 baris (54,9%) = 12,0 (sebelumnya kuartil ≈25%); 59 baris 12 padahal teks lama 7,5–30 m². Tanpa flag (N03). [V] |
| T20 C6 kasar | **SELESAI** | C6 dibuang; `cctv` dan `penjaga` jadi kriteria biner terpisah. |
| T21 path relatif | **SELESAI** | `model_dss.py:209`, `prepare_data.py:32-35` pakai `Path(__file__)`. |
| T22 nama dobel | **BELUM** | Tetap 3 nama: Kost Hoop Tipe B, Kost Hoop Tipe C, Kost Pondok Sakinah 1 (id berbeda). `prepare_data.py:39` hanya `drop_duplicates(id)`. [V] |
| T23 C5–C1 berkorelasi | **TIDAK RELEVAN LAGI** | C5 dibuang. Pengganti di data mentah: harga–ac 0,73 (bagian 6). |

Rekap: SELESAI 12 · SEBAGIAN 4 · BELUM 4 · REGRESI 1 · TIDAK RELEVAN 2.

---

## 3. Temuan baru

| ID | Tingkat | Temuan | Bukti | Saran konkret |
|---|---|---|---|---|
| N01 | **KRITIS** | Jarak rute OSRM tidak masuk akal sebagai "jarak ke kampus". | Rasio rute/garis lurus ke titik Unpad: median 3,63, p90 6,48, maks 13,7. Median jarak Unpad 4,85 km (garis lurus 1,21); 154/357 kos > 5 km. Korelasi jarak-Unpad vs jarak-ITB antar kos Pearson −0,19 / Spearman 0,09 (kedua titik hanya 0,65 km). Korelasi dengan jarak listing v1: Unpad 0,05, ITB 0,08. 1 baris rute < 0,98× garis lurus (ITB). Kos dengan garis lurus <0,5 km tapi rute >3 km: 2. `jarak_unpad_km` per bin garis lurus (0,5–1 km → median 4,87 km). Rencana rute memakai profil `driving` (`prepare_data.py:18`) dan titik tunggal (`:8-9`). `jarak_koordinat_luas_v2.txt`, `data_v2.txt` [V]. Penyebab pasti (snap titik, jalan satu arah, dll.) **[TV]**: OSRM tidak dijalankan ulang (perlu jaringan). | Pakai garis lurus (haversine) sebagai baseline atau profil jalan kaki/motor dengan titik gerbang yang dicek di peta. Tambah sanity check: tolak rute > ~2,5× garis lurus. Simpan `jarak_metode` dan `jarak_unpad_garis_lurus_km`. Tandai kriteria jarak `tersedia: false` sampai lolos. |
| N02 | **KRITIS** | 90 pasang kos berbeda berbagi lat/lng identik. | Di v1 360 baris: 180 baris (50%) berbagi titik dengan kos lain; 90 titik, tiap titik tepat 2 kos. Nama basis berbeda pada 90/90 pasangan; tipe sama hanya 32/90, harga sama 1/90. Tiap pasangan punya satu anggota di baris file ≥180. Contoh: Kost Abu Ijo Tipe Standar dan Kost Pojok Besar Tipe A di (−6,944003; 107,770818). Di `kos_scored.csv` tetap 180 baris. `koordinat_ganda_v2.txt` [V]. Mana yang salah **[TV]**. | Beri `koordinat_terverifikasi`/`sumber_koordinat`; geokode ulang minimal 90 baris itu (mis. dari URL listing). Jarak baru dihitung setelah itu. |
| N03 | **TINGGI** | Luas kamar penuh nilai default 12,0. | 196/357 = 54,9% = 12,0; 35 nilai unik. Dibanding teks `ukuran_kamar` xlsx lama (git `83e92b2`): 59 baris jadi 12 padahal teks bernilai 9 (29 baris), 7,5, 10,4, 15, 16, 20, 24, 30 m². Tak ada `luas_imputasi` atau teks ukuran. `jarak_koordinat_luas_v2.txt` [V]. Dugaan: nilai default/imputasi di sumber v1 **[D]**. | Kembalikan teks ukuran asli ke dataset, isi luas dari teks, simpan `luas_imputasi`. Sampai itu, matikan piece `luas` atau beri peringatan. |
| N04 | **TINGGI** | Rakitan awal aplikasi memakai dua kriteria yang datanya belum layak. | `KRITERIA_DEFAULT = ["harga","jarak_kampus","luas","cctv"]` (`src/config/kriteria.ts`). `jarak_kampus` membaca `C2` (N01), `luas` membaca `C4` (N03). Setelah re-import, C2 lama vs C2 baru berkorelasi −0,03: peringkat jarak berubah total. `perubahan_vs_csv_lama_v2.txt` [V]. | Ganti rakitan awal ke kriteria yang layak (harga, ac, km_dalam, cctv) sampai N01/N03 beres, atau tampilkan catatan data. |
| N05 | **SEDANG** | Ranking dan Spearman dari float mentah (tanpa pembulatan 9 desimal). | Golden `seri_saw` lama: SAW mentah `[0.5, 0.5, 0.49999999999999994]`, model mengurutkan B,A,C, harapan B,C,A (`uji_golden_lama_v2.txt`). Di 144 skenario acak: 16 beda urutan (semuanya selisih SAW mentah 1,1e-16); Spearman beda sampai 4,1e-3 di 7/143 skenario (mis. 0,9965 vs 1,0). Mesin independen dan TS (`ranking.ts:1-20`) sudah memakai 9 desimal. `uji_model_v2.txt` [V]. | Di `rank_kos`: `saw = np.round(saw_raw, 9)`, `topsis = np.round(topsis_raw, 9)` sebelum `sort_values` dan `spearmanr`. |
| N06 | **SEDANG** | Pemutus id: Python numerik, TS string. | `model_dss.py:180-183` sort `id` int; `ranking.ts:23-25` membandingkan `string` (leksikografis, `id: string` di `tipe.ts:15`). Pada 144 skenario acak: 78 punya seri penuh (SAW, TOPSIS, harga sama), dan di 32 urutannya berubah bila id dibanding sebagai string. Skenario `n02_seri_banyak` di golden baru menguji ini. [V] | Sepakati satu aturan; saran: bandingkan numerik (`Number(a.id) - Number(b.id)`) agar sama dengan Python. |
| N07 | **SEDANG** | Katalog model berisi alias ganda. | `["harga","C1"]` diterima (bobot 2/3 + 1/3 untuk satu data); `["C2","jarak_unpad_km","jarak_itb_km"]` juga diterima. C1 ≡ harga dan C4 ≡ luas persis; C2 ≡ min(unpad,itb). [V] | Hapus `C1`, `C2`, `C4` dari `KATALOG_KRITERIA`, atau tolak kombinasi alias. |
| N08 | **SEDANG** | Risiko re-import ke Supabase. | Baris 360 → 357: upsert tidak menghapus id 10145377, 44117935, 45096476 (kontrakan). C3, C5–C8 dan `alamat` akan menimpa isi lama dengan NULL. Tes TS: 2 gagal (`tests/api.test.ts:96` mengharap 360; `:115` mengharap `jarak_unpad_km` tidak ada di CSV). `kriteria.ts` komentar masih menyebut 360 baris dan xlsx. `vitest_v2.txt` [V]. | `DELETE` 3 id, import, lalu perbarui tes dan komentar. Lihat bagian 5. |
| N09 | **SEDANG** | Arti nilai 0 pada 18 flag tidak terdokumentasi dan tampak tidak konsisten. | Tidak ada NaN di flag (`data_v2.txt`); tidak ditemukan dokumentasi arti 0 (`dss-model-kos-jatinangor/` tanpa README). 65 kos `k_mandi_dalam=0` tapi `shower=1`/`air_panas=1`; 20 kos tanpa kloset duduk dan jongkok; 33 punya keduanya. [V] Arti "0 = tidak tercantum" **[D]**. | Tulis dokumentasi: 0 = "tidak ada" atau "tidak tercantum"? Bila "tidak tercantum", pertimbangkan NULL. |
| N10 | **SEDANG** | `prepare_data.py` bergantung jaringan, kegagalan diam-diam, tanpa log metode. | `jarak_rute_osrm` (`:18-29`) memakai `http://router.project-osrm.org` (HTTP, server publik), 2×357 panggilan + sleep 0,15 s; gagal 3× → `np.nan` tanpa pesan; tidak ada `jarak_metode`. Kolom non-jarak direproduksi identik dari v1 (`reproduksi_non_jarak_v2.txt` [V]); kolom jarak **[TV]** (tidak dijalankan). | Cache hasil rute ke CSV, log baris gagal, tulis tanggal/versi OSRM; pakai instans sendiri bila lanjut memakai OSRM. Kebijakan pemakaian server demo **[TV]**. |
| N11 | **RENDAH** | Komentar/label menyesatkan. | `prepare_data.py:60` "Harga bulanan langsung" padahal hanya pembulatan 2 desimal (56 baris tetap x/12); `:63` "jarak rute jalan asli". | Perbaiki komentar. |
| N12 | **RENDAH** | `RuntimeWarning: invalid value encountered in divide`. | `model_dss.py:132` `np.where(denom == 0, 1.0, d_neg / denom)` menghitung pembagian lebih dulu; muncul saat semua kandidat identik. [V] | `np.divide(d_neg, denom, out=np.ones_like(d_neg), where=denom != 0)`. |
| N13 | **RENDAH** | Output model: `bobot` dibulatkan 4 desimal (jumlah 0,9999 untuk n = 12); `p_value` dikirim (0,0 untuk n besar); `jumlah_tanpa_data` tidak per kriteria. | `uji_model_v2.txt` bagian C, F. | Kirim bobot tanpa bulatan; hilangkan p-value; tambah `tanpa_data_per_kriteria`. |
| N14 | **RENDAH** | Kolom mati dikirim terus. | C3, C5–C8, `alamat`, `url_gambar1` NULL 357/357; C1 ≡ harga, C4 ≡ luas. [V] | Buang dari CSV/tabel atau dokumentasikan sebagai turunan. |

Tidak ditemukan pasangan kriteria mentah dengan |r| > 0,9 (bagian 6), jadi tidak ada hitung ganda di tingkat data selain alias N07.

---

## 4. Kesiapan data per kriteria (katalog app)

Kolom "Layak" = terisi, tidak konstan, tidak sintetis, tanpa imputasi besar. Sumber: `kesiapan_kriteria_v2.txt` [V]. Semua binary tidak punya nilai kosong (N09 untuk arti 0).

| Kriteria | Kolom sumber | Terisi | Unik | Catatan | Layak? |
|---|---|---|---|---|---|
| harga | `harga` | 100% | 103 | 56 baris pola x/12 (T10); basis harga tak jelas | **Ya, bersyarat** |
| listrik | `termasuk_listrik` | 100% | 2 | hanya 27 kos (7,6%) bernilai 1 | Ya (pembeda sempit) |
| bayar_bulanan | `pembayaran_per_bulan` | 100% | 2 | 75,1% = 1; bukan kualitas kos | Ya, label jujur |
| bayar_tahunan | `pembayaran_per_tahun` | 100% | 2 | 71,1% = 1 | Ya, label jujur |
| luas | `luas_kamar_m2` | 100% | 35 | 54,9% = 12,0; 59 bertentangan dengan teks lama (N03) | **Tidak** (sampai dibersihkan) |
| km_dalam | `k_mandi_dalam` | 100% | 2 | 66,7% = 1 | Ya |
| ac | `ac` | 100% | 2 | 25,5% = 1 | Ya |
| jendela | `jendela` | 100% | 2 | 68,3% = 1 | Ya |
| tv | `tv` | 100% | 2 | 31,7% = 1 | Ya |
| shower | `shower` | 100% | 2 | 60,8% = 1 | Ya |
| air_panas | `air_panas` | 100% | 2 | 31,1% = 1 | Ya |
| kloset_duduk | `kloset_duduk` | 100% | 2 | 62,7% = 1; korelasi −0,69 dengan `kloset_jongkok`; 20 kos tanpa keduanya | Ya, bersyarat |
| cctv | `cctv` | 100% | 2 | 42,3% = 1 | Ya |
| penjaga | `penjaga` | 100% | 2 | 61,1% = 1 | Ya |
| parkir_motor | `parkir_motor_sepeda` | 100% | 2 | 91,6% = 1 (hanya 30 kos 0) | Ya (pembeda rendah) |
| parkir_mobil | `parkir_mobil` | 100% | 2 | 47,6% = 1 | Ya |
| wifi | `wifi` | 100% | 2 | 86,8% = 1 | Ya (pembeda rendah) |
| ruang_tamu | `ruang_tamu` | 100% | 2 | 34,7% = 1 | Ya |
| ruang_jemur | `ruang_jemur` | 100% | 2 | 58,8% = 1 | Ya |
| jarak_unpad | `jarak_unpad_km` | 100% | 252 | rute OSRM tidak masuk akal, koordinat ganda (N01, N02) | **Tidak** |
| jarak_itb | `jarak_itb_km` | 100% | 250 | sama; 1 kos tepat 0,000 km | **Tidak** |
| jarak_kampus (C2) | `C2` | 100% | 247 | min(unpad,itb); 80,1% dari ITB | **Tidak** |
| deposit | (tidak ada) | 0% | – | belum ada kolom | Tidak tersedia |
| minimarket | (tidak ada) | 0% | – | belum ada kolom | Tidak tersedia |
| pasar | (tidak ada) | 0% | – | belum ada kolom | Tidak tersedia |

**Uji subset arbitrer (`uji_model_v2.txt` C dan G) [V].** `rank_kos` berjalan dengan n = 1, 2, 4, 12 (budget Rp 2 jt putra, 57 kandidat). Bobot: jumlah 1,000000000000000 dan sama dengan rumus eksak (selisih 0,0) untuk n = 1, 2, 3, 4, 8, 12. n = 1 → bobot 1,0. Satu catatan: bobot di output `rank_kos` dibulatkan 4 desimal, jumlah n = 12 menjadi 0,9999 (N13).

---

## 5. Perubahan skema yang diperlukan di Supabase

Tabel `public.kos` saat ini (35 kolom, 360 baris, dari kueri awal sesi ini) vs `kos_scored.csv` baru (37 kolom, 357 baris).

| Kolom | Supabase sekarang | CSV baru | Aksi |
|---|---|---|---|
| `id` | integer | int64 (maks 99.998.856 < 2.147.483.647) | Tetap |
| `nama`, `tipe_penghuni` | text | text; campur 160, putri 133, putra 64 | Tetap |
| `alamat` | placeholder "Jatinangor, Sumedang" | NULL 357/357 | Nilai berubah ke NULL |
| `lat`, `lng` | **text** | float64 (357 valid; 90 pasangan duplikat) | Impor sebagai teks; atau ganti tipe jadi `numeric` |
| `harga` | numeric | float, 56 desimal x/12 | Tetap; tambah kolom basis (di bawah) |
| `C1`, `C4` | terisi | ≡ `harga`, ≡ `luas_kamar_m2` | Redundan |
| `C2` | terisi (median 1,1 km) | min jarak OSRM (median 2,05; korelasi −0,03 dengan lama) | Nilai berubah total |
| `C3`, `C5`–`C8` | terisi | **NULL 357/357** | Akan menimpa dengan NULL; sebaiknya drop |
| `luas_kamar_m2` | terisi | 61 baris beda dari C4 lama (N03) | Nilai berubah |
| 18 flag | terisi | identik dengan CSV lama (0 selisih) | Tetap |
| `url_gambar1` | NULL 360/360 | NULL 357/357 | Tetap kosong |
| **baru** `jarak_unpad_km` | – | numeric, 357/357 | **Tambah kolom** |
| **baru** `jarak_itb_km` | – | numeric, 357/357 | **Tambah kolom** |
| baris | 360 | 357 | **Hapus** id 10145377, 44117935, 45096476 |

**Kolom yang disarankan ditambah** (belum ada di CSV; tanpa ini sebagian UI tetap kosong):
- `jarak_unpad_garis_lurus_km`, `jarak_itb_garis_lurus_km`, `jarak_metode` (mis. "osrm-driving-20261121"), `koordinat_terverifikasi` (bool) / `sumber_koordinat`.
- `url` (listing) dan `foto_url` (+ `foto_urls`); `alamat` asli; kontak (`kontak_nama`, `kontak_wa`).
- `harga_bulanan`, `harga_tahunan`, `basis_harga`.
- `luas_imputasi` (bool) dan `ukuran_kamar_teks`.
- `deposit`, `jarak_minimarket_km`, `jarak_pasar_km` bila datanya akan dikumpulkan.
- `diperbarui_at` / `tanggal_scrape`.

---

## 6. Hasil tes dan sensitivitas

### 6.1 Tes yang dijalankan (langkah 3) [V]

| Tes | Hasil | Keterangan |
|---|---|---|
| `model_dss.py` (`__main__`) | **LULUS**, exit 0 | 74 kandidat, Spearman 0,9241; top-1 Kost Pondok Darul Ulum II |
| `audit/golden_test.py` | **GAGAL**, exit 1 | Bagian "independen" 4/4 cocok; macet di bagian "fungsi teman": `normalisasi_minmax()` kini butuh argumen `urutan_kriteria` (perubahan API) |
| `audit/audit_data.py` | **GAGAL**, exit 1 | `FileNotFoundError`: `dataset_kos_mamikos.xlsx` dihapus di commit `8ca2b29` |
| `audit/bandingkan.py` | **GAGAL**, exit 1 | `ValueError: Kriteria 'C3' tidak ada di katalog` |
| `audit/sensitivitas.py` | **GAGAL**, exit 1 | `AssertionError` pada `:114`: skrip memakai C1–C8, sedangkan C3 dan C5–C8 kini NULL |
| `run_all.ps1` | tidak dijalankan langsung | Menulis ke `audit/out` dan menimpa `golden_test.json`; langkahnya ditiru satu per satu pada salinan di scratchpad (`skrip_lama_v2.txt`) |
| `golden_test.json` lama vs model sekarang | **3 dari 4 lulus** | `utama_3x3`, `kolom_konstan`, `satu_kandidat` lulus; **`seri_saw` gagal** (N05) |
| Model vs mesin independen, 144 skenario | skor cocok | selisih SAW/TOPSIS maks 2,2e-16; skor 4 desimal 5e-5; 144/144 JSON valid, 144/144 rank unik; urutan id beda 16; Spearman beda 4,1e-3 (7 skenario) |
| `golden_dinamis.json` vs `model_dss.py` | **11/11 cocok** | urutan id sama, selisih skor 4 desimal 0, Spearman sama, jumlah tanpa data sama |
| Vitest (TypeScript) | **69 lulus, 2 gagal** | Dua gagal karena data baru (N08) |

### 6.2 Sensitivitas (langkah 6) [V `sensitivitas_v2.txt`]

Semua urutan prioritas diuji: 4! = 24 untuk rakitan app (harga, jarak_kampus, luas, cctv) dan 8! = 40.320 untuk 8 kriteria (harga, jarak_kampus, luas, km_dalam, ac, wifi, cctv, penjaga). Skor dibulatkan 9 desimal sebelum ranking.

Set 4 kriteria (24 urutan):

| Skenario | Kandidat | #1 berbeda | #1 paling sering | Top-3 berbeda | #1 SAW = #1 TOPSIS | Spearman min / median |
|---|---|---|---|---|---|---|
| ≤1 jt putri | 61 | 3 | Kost Bunda 1 Tipe Vip (45,8%) | 6 | 87,5% | 0,944 / 0,972 |
| ≤1 jt putra | 24 | 4 | Kost Dyana (33,3%) | 7 | 66,7% | 0,887 / 0,964 |
| ≤1,5 jt putri | 98 | 5 | Kost Bunda 1 Tipe Vip (33,3%) | 9 | 87,5% | 0,930 / 0,972 |
| ≤1,5 jt campur | 143 | 8 | Kost Pondok Maharani Tipe A2 (25,0%) | 16 | 83,3% | 0,909 / 0,961 |

Set 8 kriteria (40.320 urutan):

| Skenario | Kandidat | #1 berbeda | #1 paling sering | Top-3 berbeda | #1 SAW = #1 TOPSIS | Spearman min / p5 / median |
|---|---|---|---|---|---|---|
| ≤1 jt putri | 61 | 5 | Kost Wisma Triarga Tipe Executive (45,5%) | 17 | 90,0% | 0,869 / 0,929 / 0,977 |
| ≤1 jt putra | 24 | 4 | Kost Dyana (59,8%) | 10 | 70,9% | 0,584 / 0,877 / 0,974 |
| ≤1,5 jt putri | 98 | 5 | Kost Pondok Niaibas Tipe A (71,9%) | 24 | 74,3% | 0,820 / 0,917 / 0,974 |
| ≤1,5 jt campur | 143 | 9 | Kost Wisma Pelangi 1 (35,9%) | 49 | 77,2% | 0,705 / 0,887 / 0,975 |

Bacaan: urutan prioritas tetap mengubah hasil (top-3 berbeda 6–49 kombinasi). SAW dan TOPSIS (min-max) tetap sangat mirip (median ρ ≈ 0,96–0,98, tapi min bisa 0,58), namun #1 hanya sama di 67–90% urutan. Catatan: ranking set yang memuat `jarak_kampus` dan `luas` ikut terdampak N01/N03, jadi angka di atas adalah sifat metode, bukan rekomendasi kos.

Korelasi antar kriteria (357 kos, `korelasi_v2.txt`): **tidak ada pasangan |r| > 0,9**. Pasangan tertinggi: `bayar_bulanan`–`km_dalam` 0,815 (sedang, >0,7), `harga`–`ac` 0,728, `jarak_unpad`–`jarak_kampus` 0,664/0,734 (Spearman), `ac`–`air_panas` 0,607, `harga`–`air_panas` 0,566, `shower`–`kloset_duduk` 0,568, `jarak_itb`–`jarak_kampus` 0,533. Kasus identik secara matematis (bukan korelasi): C1 ≡ harga, C4 ≡ luas, C2 = min(unpad, itb). `jarak_unpad` vs `jarak_itb` justru −0,19 (anomali N01).

### 6.3 Golden fixture baru (langkah 7)

`audit/out_v2/golden_dinamis.json` (584 KB, JSON valid, tanpa NaN), dibuat oleh `skrip/golden_dinamis_v2.py` dengan mesin `skrip/dss_exact.py` (Decimal 60 digit, tidak menyalin `model_dss.py`/`src/lib/dss`). Sebelas skenario:

n = 1 `n01_harga` · n = 2 `n02_jarak_luas`, `n02_seri_banyak` · n = 3 `n03_satu_kandidat`, `n03_dua_kandidat`, `n03_nol_kandidat`, `n03_kolom_konstan` · n = 4 `n04_default_app`, `n04_nilai_kosong` · n = 8 `n08_campur_ikut` · n = 12 `n12_penuh`.

Isi tiap skenario: `masukan` (budget, tipe, ikutkan_campur), `kriteria` (kode, jenis, kolom sumber), `bobot` (+ `bobot_pecahan`), `kandidat_lolos_filter`, `dikecualikan_nilai_kosong` + `tanpa_data_per_kriteria`, `baris_kandidat` (nilai mentah, agar tes TS tidak perlu Supabase), `hasil` per kos (`rank`, `rank_topsis`, SAW/TOPSIS/skor_kriteria **tanpa pembulatan** dan **4 desimal**), `spearman` (null bila tak terdefinisi) dan blok `model_dss_py` (hasil banding dengan model). Skenario `n04_nilai_kosong` menyuntikkan nilai kosong (`override_nilai`) karena data asli tidak punya NULL. `n02_seri_banyak` menguji pemutus id numerik (N06). Toleransi yang disarankan: 1e-9 (tanpa pembulatan), 1e-4 (4 desimal).

---

## 7. Daftar tugas untuk teman (siap salin)

1. Jangan pakai angka jarak OSRM sekarang. Bandingkan beberapa kos secara manual di peta (mis. Kost Pondok Kaca II Tipe B: garis lurus ke Unpad 0,90 km tetapi data 5,97 km). Perbaiki: pakai jarak garis lurus (haversine) sebagai baseline, atau profil rute jalan kaki/motor, dengan titik gerbang Unpad dan ITB yang dicek di peta. Tolak hasil rute yang lebih dari sekitar 2,5 kali garis lurus.
2. Simpan metode dan sumber jarak: kolom jarak_metode, jarak_unpad_garis_lurus_km, jarak_itb_garis_lurus_km. Catat tanggal pengambilan dan versi layanan rute.
3. Periksa 90 pasang kos yang berbagi lat/lng identik (lihat audit/out_v2/koordinat_ganda_v2.txt). Geokode ulang dari URL listing atau peta. Tambah kolom koordinat_terverifikasi.
4. Kembalikan teks ukuran_kamar asli ke dataset. Hitung luas darinya, simpan luas_imputasi, dan jelaskan kenapa 59 kos kini bernilai 12,0 padahal teks lama berbeda.
5. Putuskan arti nilai 0 pada 18 kolom flag (tidak ada atau tidak tercantum) dan tulis dokumentasinya. Cek 65 kos dengan k_mandi_dalam = 0 tetapi shower atau air_panas = 1.
6. Di rank_kos, bulatkan skor SAW dan TOPSIS ke 9 desimal sebelum sort_values dan spearmanr. Setelah itu golden_test.json lama (kasus seri_saw) harus lulus.
7. Sepakati pemutus seri terakhir: id dibanding sebagai angka (Python) atau string (TS di src/lib/dss/ranking.ts). Saran: numerik, lalu ubah TS.
8. Hapus alias C1, C2, C4 dari KATALOG_KRITERIA di model_dss.py, atau tolak kombinasi alias (harga bersama C1, atau C2 bersama jarak_unpad_km/jarak_itb_km).
9. Hapus kolom mati dari kos_scored.csv: C3, C5, C6, C7, C8 (dan C1, C2, C4 bila dianggap turunan). Kosongkan juga alamat dan url_gambar1 hanya bila memang belum ada datanya.
10. Isi data tampilan yang masih nol: url listing, foto_url, alamat asli, kontak. Tambah kolom harga_bulanan, harga_tahunan, basis_harga untuk 56 baris berharga x/12.
11. Keluarkan atau tandai dua kos di luar Jatinangor (Kost Haffair Rancaekek, Kost Fengsui Tipe A Cileunyi Bandung) dan beri pembeda untuk 3 nama dobel (Hoop Tipe B, Hoop Tipe C, Pondok Sakinah 1).
12. Perbaiki warning model_dss.py baris 132 dengan np.divide(..., where=denom != 0). Keluarkan bobot tanpa pembulatan, buang p_value, dan tambah tanpa_data_per_kriteria.
13. Perbaiki prepare_data.py: simpan cache rute, catat baris yang gagal, ganti komentar "Harga bulanan langsung". Tambah README yang menjelaskan alur dataset/dataset_kos_v1.csv ke kos_scored.csv.
14. Sebelum import ke Supabase: tambah kolom jarak_unpad_km, jarak_itb_km (dan kolom baru di bagian 5), hapus id 10145377, 44117935, 45096476, lalu import 357 baris. Perbarui tests/api.test.ts (360 menjadi 357, aturan kolom jarak) dan komentar di src/config/kriteria.ts.

---

## 8. Pertanyaan untuk teman

1. Dari mana lat/lng di dataset_kos_v1.csv (Google Maps, geokode nama, scraping Mamikos)? Kenapa 90 pasang kos berbeda punya koordinat identik?
2. Titik acuan Unpad (-6.926132, 107.774689) dan ITB (-6.928088, 107.769118): gerbang yang mana, dan diambil dari mana? Kenapa profil rute `driving` (mobil), bukan jalan kaki/motor?
3. Pernah membandingkan hasil OSRM dengan jarak listing (korelasi 0,05)? Mana yang menurutmu benar, dan kenapa jarak ke Unpad jauh lebih besar dari garis lurus?
4. Kenapa 54,9% luas kamar bernilai 12,0? Apakah 12 itu default saat teks ukuran tidak ada, dan di mana teks ukuran aslinya (xlsx dihapus)?
5. Harga berdesimal (mis. 833333,33): itu harga tahunan dibagi 12? Ada harga bulanan aslinya?
6. Arti nilai 0 pada kolom flag: "tidak ada" atau "tidak tercantum di listing"? Kenapa 65 kos kamar mandi dalam = 0 tetapi shower/air panas = 1?
7. Sumber data v1 batch kedua (baris 180 ke atas) beda dengan batch pertama? Semua pasangan koordinat ganda punya satu anggota di sana.
8. Masih ada URL listing, foto, nama/nomor pemilik, alamat dari hasil scraping? Kapan scraping dilakukan?
9. Kos campur: apakah pencari putra/putri ikut melihatnya (`allow_campur`)? Keputusan ini belum final di app (`IKUTKAN_CAMPUR_DEFAULT = false`).
10. Pemutus seri terakhir: id angka atau string? Dan setuju memakai pembulatan 9 desimal sebelum ranking?
11. Dua kos di luar Jatinangor (Rancaekek, Cileunyi) dan 3 nama dobel: sengaja dipertahankan?
12. `C1`, `C2`, `C4` masih dibutuhkan di kos_scored.csv atau boleh dihapus (hanya turunan)? Kolom `C3`, `C5`–`C8` yang kosong?

---

## Lampiran: keterbatasan audit ini

- **[TV]** Kebenaran koordinat dan titik gerbang kampus: tidak ada sumber eksternal yang diperiksa; hanya konsistensi internal (haversine, duplikasi, korelasi).
- **[TV]** `prepare_data.py` tidak dijalankan ulang (butuh jaringan ke server OSRM publik). Hanya bagian non-jarak yang direproduksi identik (`reproduksi_non_jarak_v2.txt`).
- Supabase tidak dikueri ulang dalam audit ini; keadaan tabel diambil dari kueri awal sesi (360 baris, 35 kolom) dan deskripsi pengguna.
- Mesin independen memakai varian TOPSIS min-max (sama seperti model dan TS); TOPSIS vektor tidak diulang karena sudah dibahas di audit v1.
- Skrip lama tidak diperbaiki (aturan: tidak mengubah file teman). `audit_data_v2.py`, `cek_jarak_luas_v2.py`, `cek_koord_ganda.py` memakai argumen path (lihat docstring) karena membaca salinan data identik; skrip lain dijalankan langsung dari `audit/out_v2/skrip/` dengan `audit/.venv`.
