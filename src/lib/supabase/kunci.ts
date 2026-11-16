/**
 * Klasifikasi jenis API key Supabase TANPA mencetak nilainya. Fungsi murni.
 * "rahasia" = sb_secret_… atau JWT role service_role → tidak boleh dipakai aplikasi.
 */
export function jenisKunci(key: string): "publishable" | "anon" | "rahasia" | "tidak-dikenal" {
  if (key.startsWith("sb_secret_")) return "rahasia";
  if (key.startsWith("sb_publishable_")) return "publishable";
  const bagian = key.split(".");
  if (bagian.length === 3) {
    try {
      const payload = JSON.parse(atob(bagian[1].replace(/-/g, "+").replace(/_/g, "/"))) as { role?: unknown };
      if (payload.role === "anon") return "anon";
      if (payload.role === "service_role") return "rahasia";
    } catch {
      // bukan JWT yang valid
    }
  }
  return "tidak-dikenal";
}


/**
 * URL proyek Supabase harus hanya origin ("https://<ref>.supabase.co"): supabase-js
 * menambah "/rest/v1" sendiri. Kalau env terisi "…/rest/v1/" (salah format yang umum),
 * path dobel membuat PostgREST menjawab PGRST125. Fungsi ini membuang path/query/hash.
 * Nilai tidak valid dikembalikan apa adanya supaya galatnya muncul dari klien.
 */
export function normalisasiUrl(url: string): string {
  try {
    return new URL(url.trim()).origin;
  } catch {
    return url.trim();
  }
}
