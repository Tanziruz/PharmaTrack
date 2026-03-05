/**
 * Re-exports React's `cache()` for per-request memoization and deduplication.
 * This is the correct pattern for Next.js App Router + Supabase SSR client,
 * which calls `cookies()` and therefore cannot use `unstable_cache`.
 */
export { cache } from "react"
