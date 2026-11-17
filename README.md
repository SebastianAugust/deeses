# CariKos

Rekomendasi kos di Jatinangor dengan metode SAW (TOPSIS sebagai pembanding). Pengguna memilih budget dan tipe penghuni, lalu **merakit kriteria sendiri** (sistem "lego"): memasang 1–12 kriteria dari katalog dan mengurutkannya. Bobot dihitung dengan rank-sum dari urutan itu.

Stack: Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · shadcn/@base-ui · dnd-kit · motion · zod · Supabase · Vitest.

## Menjalankan

```bash
npm install
npm run dev     # http://localhost:3000
npm test        # Vitest
npm run lint
npm run build
```

Isi `.env.local` mengikuti `.env.example` (URL Supabase + anon/publishable key).

## Struktur penting

| Path | Isi |
|---|---|
| `src/config/site.ts` | Nama tampilan, slug, deskripsi (satu sumber). |
| `src/components/ui/logo.tsx` | Logo sementara (ganti logo cukup di sini). |
| `src/config/kriteria.ts` | Katalog kriteria: kategori, jenis cost/benefit, kolom sumber, `tersedia`. |
| `src/lib/dss/` | Engine murni: filter, eksklusi data kosong, rank-sum, min-max, SAW, TOPSIS, Spearman. |
| `src/app/api/rank` | `POST {budget, tipe, kriteria: string[]}` → `{hasil, kriteria_dipakai, jumlah_tanpa_data, tanpa_data_per_kriteria, spearman}` |
| `src/app/api/kriteria` | `GET` → katalog kriteria tersedia, terkelompok per kategori. |
| `design/` | `DESIGN.md` + mockup (09/10 = sistem lego kriteria). |

Kriteria yang datanya belum ada di tabel `public.kos` tetap tercatat di katalog (`tersedia: false` + alasan) tetapi tidak tampil di UI dan ditolak API. Kos yang datanya kosong di kriteria terpasang tidak diimputasi: kos itu disembunyikan dan jumlahnya ditampilkan di halaman peringkat.
