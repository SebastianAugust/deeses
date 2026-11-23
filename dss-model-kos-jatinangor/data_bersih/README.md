# data_bersih — data kos yang dirapikan (CariKos / DSS Kos Jatinangor)

File teman (`kos_scored.csv`, `model_dss.py`, `prepare_data.py`) TIDAK diubah. Semua keluaran ada di folder ini.

## Status data: sebagian SIMULASI / PERKIRAAN
Data kos ini untuk tugas kuliah dan **tidak semuanya terverifikasi**. Web, laporan, dan README harus menyebutnya.

| Kolom `koordinat_status` | Jumlah | Arti |
|---|---|---|
| `terverifikasi` | 8 | Dicek manual lewat Mamikos / Google Maps |
| `geokode` | 177 | Hasil pencarian nama di Google (titik bangunan, di Jatinangor, tidak bentrok antar-kos) |
| `perkiraan` | 169 | Titik meragukan: hanya area, atau satu titik dipakai banyak kos berbeda (dipakai koordinat lama), atau belum dikonfirmasi. Bisa meleset 1–2 km |

`alamat` hanya diisi untuk `terverifikasi` dan `geokode` (183 kos); yang lain kosong, bukan alamat karangan.
Catatan: hasil geokoder berasal dari Google; aturan penyimpanan koordinat/alamat hasil Google untuk proyek ini **belum diverifikasi**.

## Arti nilai 0 pada kolom fasilitas
`0` = **tidak tercantum** (bisa tidak ada, bisa tidak diketahui), bukan "pasti tidak ada". Contoh: 65 kos punya `k_mandi_dalam=0` tapi `shower=1`. Di web ditampilkan "-"; di SAW tetap dihitung 0. `termasuk_listrik=0` = "tidak termasuk".

## Yang dibersihkan
- **354 kos** dari 357 (Supabase 360): dibuang Haffair (Rancaekek), Fengsui (Cileunyi), Nasution (tutup permanen) dan 3 rumah kontrakan (hanya ada di Supabase).
- **Luas kamar**: dihitung ulang dari teks ukuran asli (`ukuran_kamar_asli.csv`, mis. "3x4"). 63 baris di data teman berbeda (banyak yang diisi 12 m² padahal ukurannya 3x3, 4x5, dst.). 4 kos tanpa ukuran masuk akal → kosong (`luas_status = tidak_tercantum`): Azahra Tipe A, Bumi Sadang Tipe A, Pondok Tirta Tipe A dan B.
- **Nama ganda**: yang kedua diberi " (2)" di kolom `nama` (3 kos), tanpa kolom baru.
- **Harga**: 55 harga berasal dari harga tahunan dibagi 12 → `basis_harga = tahun_dibagi_12` (selain itu `bulan`). Tidak semua kos bisa dibayar bulanan.
- **Jarak**: dikosongkan dulu di `migrasi.sql` (jarak lama dari koordinat lama). Diisi lagi lewat `hitung_jarak.py`.

## Urutan menjalankan
1. (Sudah) `python buat_kos_bersih.py` → `kos_bersih.csv` dan `migrasi.sql`. Bisa diulang kapan saja.
2. **Ekspor tabel `public.kos` dari Supabase ke CSV sebagai cadangan.**
3. Supabase > SQL Editor: jalankan preflight di kepala `migrasi.sql`, lalu jalankan seluruh `migrasi.sql`. Hasil akhir harus `jumlah = 354`, `nama_unik = 354`, `tanpa_status = 0`.
4. Di laptop sendiri: `python hitung_jarak.py` (±12 menit, bisa dilanjutkan kalau terputus). Hasil: `jarak.sql`, `jarak_log.txt` (cek baris "TAK WAJAR"/"GAGAL").
5. Jalankan `jarak.sql` di SQL Editor.

## Jarak
Jarak rute mobil lewat OSRM (data OpenStreetMap), ke Unpad (Tugu Makalangan/Gerlam, -6.9313996, 107.7761314) dan ITB Jatinangor (-6.9336088, 107.7682456); `C2` = yang terdekat. Ini **perkiraan jarak rute**, tidak dikalibrasi dengan Google (dari sampel kecil OSRM ±15–45% lebih panjang, konsisten). Garis lurus tidak dipakai (2,5–4× terlalu pendek). Tampilkan dibulatkan 0,1 km dan berlabel "perkiraan".

## File
| File | Isi |
|---|---|
| `kos_bersih.csv` | data akhir (354 baris) |
| `migrasi.sql`, `jarak.sql` | perubahan untuk Supabase (tidak menyentuh foto/fasilitas) |
| `buat_kos_bersih.py`, `hitung_jarak.py` | pembuat data (bisa diulang) |
| `geokode_semua.csv`, `geokode_semua_status.csv` | hasil geokoder mentah dan statusnya |
| `koordinat_manual.csv` | 12 kos yang dicek manual |
| `cek_koordinat.csv` | 166 kos "perlu dicek" (opsional, belum dikerjakan) |
| `ukuran_kamar_asli.csv` | teks ukuran kamar dari xlsx asli |
