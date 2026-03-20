"use server"

import { cache } from "@/lib/cache"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/utils/supabase/server"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database, Stock } from "@/lib/types/database"

const UpdateReorderLevelSchema = z.object({
  id:            z.string().uuid(),
  reorder_level: z.coerce.number().int().min(0),
})

export type StockActionState = {
  success: boolean
  message: string
}

/**
 * Recompute `quantity_available` for a given batch from the purchases/sales
 * tables (source of truth), then sync the `to_be_ordered` table.
 * This is the single function called after every purchase/sale add/edit/delete.
 */
export async function recalculateStockAndOrders(
  supabase: SupabaseClient<Database>,
  batchNumber: string,
  medicineName: string,
  mrp: number,
  expiryDate: string,
) {
  // All 3 reads fire in parallel — independent of each other
  const [
    { data: purchases },
    { data: sales },
    { data: existingStocks },
  ] = await Promise.all([
    supabase.from("purchases").select("quantity_bought, supplier_name").eq("batch_number", batchNumber),
    supabase.from("sales").select("quantity_sold").eq("batch_number", batchNumber),
    supabase.from("stocks").select("id, reorder_level").eq("batch_number", batchNumber).order("created_at", { ascending: true }),
  ])

  const totalBought = (purchases ?? []).reduce(
    (sum: number, p: { quantity_bought: number }) => sum + p.quantity_bought, 0,
  )

  // Supplier = most recent purchase that has one set
  const supplierName: string | null =
    [...(purchases ?? [])].reverse().find(
      (p: { supplier_name: string | null }) => p.supplier_name,
    )?.supplier_name ?? null

  const totalSold = (sales ?? []).reduce(
    (sum: number, s: { quantity_sold: number }) => sum + s.quantity_sold, 0,
  )

  const newQty = Math.max(0, totalBought - totalSold)
  const primaryStock = (existingStocks ?? [])[0]
  const reorderLevel = (existingStocks ?? []).reduce(
    (maxLevel: number, row: { reorder_level: number }) => Math.max(maxLevel, row.reorder_level),
    10,
  )
  const duplicateIds = (existingStocks ?? []).slice(1).map((row: { id: string }) => row.id)

  // Stock upsert + to-be-ordered delete are independent — run in parallel
  await Promise.all([
    primaryStock
      ? supabase.from("stocks").update({
          quantity_available: newQty,
          medicine_name: medicineName,
          mrp,
          expiry_date: expiryDate,
          reorder_level: reorderLevel,
          supplier_name: supplierName,
          updated_at: new Date().toISOString(),
        }).eq("id", primaryStock.id)
      : totalBought > 0
        ? supabase.from("stocks").insert({
            medicine_name: medicineName,
            batch_number: batchNumber,
            mrp,
            expiry_date: expiryDate,
            quantity_available: newQty,
            reorder_level: reorderLevel,
            supplier_name: supplierName,
          })
        : Promise.resolve(),
    duplicateIds.length > 0
      ? supabase.from("stocks").delete().in("id", duplicateIds)
      : Promise.resolve(),
    supabase
      .from("to_be_ordered")
      .delete()
      .eq("batch_number", batchNumber)
      .in("reason", ["low_stock", "out_of_stock"])
      .eq("is_ordered", false),
  ])

  if (totalSold > 0) {
    await supabase.from("to_be_ordered").insert({
      medicine_name: medicineName,
      batch_number: batchNumber,
      reason: "out_of_stock",
      quantity_needed: totalSold,
      supplier_name: supplierName,
      is_ordered: false,
    })
  }
}

export async function updateReorderLevel(
  _prev: StockActionState,
  formData: FormData,
): Promise<StockActionState> {
  const raw = {
    id:            formData.get("id"),
    reorder_level: formData.get("reorder_level"),
  }

  const parsed = UpdateReorderLevelSchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, message: "Invalid data." }
  }

  const supabase = await createClient()

  const { data: stockRow, error: stockFindError } = await supabase
    .from("stocks")
    .select("batch_number")
    .eq("id", parsed.data.id)
    .maybeSingle()

  if (stockFindError || !stockRow) {
    return { success: false, message: "Stock row not found." }
  }

  const { error } = await supabase
    .from("stocks")
    .update({ reorder_level: parsed.data.reorder_level, updated_at: new Date().toISOString() })
    .eq("batch_number", stockRow.batch_number)

  if (error) {
    return { success: false, message: `Database error: ${error.message}` }
  }

  revalidatePath("/stocks")
  revalidatePath("/to-order")
  revalidatePath("/")

  return { success: true, message: "Reorder level updated." }
}

export const getStocks = cache(async () => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("stocks")
    .select("*")
    .order("updated_at", { ascending: false })
  if (error) throw new Error(error.message)

  const grouped = new Map<string, Stock>()

  for (const stock of data ?? []) {
    const existing = grouped.get(stock.batch_number)
    if (!existing) {
      grouped.set(stock.batch_number, { ...stock })
      continue
    }

    // If duplicate rows exist for a batch, present one merged stock row in the UI.
    existing.quantity_available += stock.quantity_available
    existing.reorder_level = Math.max(existing.reorder_level, stock.reorder_level)

    if (!existing.supplier_name && stock.supplier_name) {
      existing.supplier_name = stock.supplier_name
    }
  }

  return Array.from(grouped.values()).sort((a, b) => a.medicine_name.localeCompare(b.medicine_name))
})

// Derives stats from the cached getStocks() — no extra DB query
export async function getStockSummary() {
  const data = await getStocks()
  const today = new Date()
  const in150Days = new Date(today.getTime() + 150 * 24 * 60 * 60 * 1000)
  return {
    total:        data.length,
    lowStock:     data.filter((s) => s.quantity_available > 0 && s.quantity_available < s.reorder_level).length,
    outOfStock:   data.filter((s) => s.quantity_available === 0).length,
    expiringSoon: data.filter((s) => { const exp = new Date(s.expiry_date); return exp <= in150Days && exp >= today }).length,
  }
}

// Derives from cached getStocks() — no extra DB query
export async function getStockBatchNumbers() {
  const data = await getStocks()
  return data
    .filter((s) => s.quantity_available > 0)
    .map((s) => ({
      medicine_name:      s.medicine_name,
      batch_number:       s.batch_number,
      mrp:                s.mrp,
      expiry_date:        s.expiry_date,
      quantity_available: s.quantity_available,
    }))
}
