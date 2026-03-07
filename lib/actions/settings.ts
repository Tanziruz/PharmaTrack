"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/utils/supabase/server"

export type SettingsActionState = {
  success: boolean
  message: string
}

/**
 * Purge ALL data from every table in the correct order
 * (respecting foreign-key-like dependencies).
 */
export async function purgeAllData(): Promise<SettingsActionState> {
  const supabase = await createClient()

  // Delete in dependency order: sales → purchases → to_be_ordered → stocks
  // Parties are intentionally preserved.
  const tables = ["sales", "purchases", "to_be_ordered", "stocks"] as const

  for (const table of tables) {
    const { error } = await supabase.from(table).delete().neq("id", "00000000-0000-0000-0000-000000000000")
    if (error) {
      return { success: false, message: `Failed to clear ${table}: ${error.message}` }
    }
  }

  revalidatePath("/", "layout")

  return { success: true, message: "All data has been purged successfully." }
}
