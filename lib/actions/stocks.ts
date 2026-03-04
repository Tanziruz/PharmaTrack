"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/utils/supabase/server"
import type { SupabaseClient } from "@supabase/supabase-js"

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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function recalculateStockAndOrders(
  supabase: SupabaseClient<any>,
  batchNumber: string,
  medicineName: string,
  mrp: number,
  expiryDate: string,
) {
  // Sum all purchases for this batch
  const { data: purchases } = await supabase
    .from("purchases")
    .select("quantity_bought, supplier_name")
    .eq("batch_number", batchNumber)

  const totalBought = (purchases ?? []).reduce(
    (sum: number, p: { quantity_bought: number }) => sum + p.quantity_bought, 0,
  )

  // Determine supplier from the most recent purchase that has one set
  const supplierName: string | null =
    [...(purchases ?? [])].reverse().find(
      (p: { supplier_name: string | null }) => p.supplier_name,
    )?.supplier_name ?? null

  // Sum all sales for this batch
  const { data: sales } = await supabase
    .from("sales")
    .select("quantity_sold")
    .eq("batch_number", batchNumber)

  const totalSold = (sales ?? []).reduce(
    (sum: number, s: { quantity_sold: number }) => sum + s.quantity_sold, 0,
  )

  const newQty = Math.max(0, totalBought - totalSold)

  // Upsert stock row
  const { data: existingStock } = await supabase
    .from("stocks")
    .select("id, reorder_level")
    .eq("batch_number", batchNumber)
    .maybeSingle()

  let reorderLevel = 10 // default

  if (existingStock) {
    reorderLevel = existingStock.reorder_level
    await supabase
      .from("stocks")
      .update({
        quantity_available: newQty,
        medicine_name: medicineName,
        mrp,
        expiry_date: expiryDate,
        supplier_name: supplierName,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingStock.id)
  } else if (totalBought > 0) {
    await supabase.from("stocks").insert({
      medicine_name: medicineName,
      batch_number: batchNumber,
      mrp,
      expiry_date: expiryDate,
      quantity_available: newQty,
      supplier_name: supplierName,
    })
  }

  // ── Sync to_be_ordered ────────────────────────────────────────────────────
  // Remove old auto-generated pending entries for this batch
  await supabase
    .from("to_be_ordered")
    .delete()
    .eq("batch_number", batchNumber)
    .in("reason", ["low_stock", "out_of_stock"])
    .eq("is_ordered", false)

  // Whatever has been sold should appear in to-be-ordered
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

  const { error } = await supabase
    .from("stocks")
    .update({ reorder_level: parsed.data.reorder_level, updated_at: new Date().toISOString() })
    .eq("id", parsed.data.id)

  if (error) {
    return { success: false, message: `Database error: ${error.message}` }
  }

  revalidatePath("/stocks")
  revalidatePath("/to-order")

  return { success: true, message: "Reorder level updated." }
}

export async function getStocks() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("stocks")
    .select("*")
    .order("medicine_name", { ascending: true })

  if (error) throw new Error(error.message)
  return data
}

export async function getStockSummary() {
  const supabase = await createClient()

  const { data, error } = await supabase.from("stocks").select("*")
  if (error) return { total: 0, lowStock: 0, expiringSoon: 0 }

  const today = new Date()
  const in60Days = new Date(today)
  in60Days.setDate(today.getDate() + 60)

  const total = data.length
  const lowStock = data.filter(
    (s) => s.quantity_available > 0 && s.quantity_available < s.reorder_level,
  ).length
  const outOfStock = data.filter((s) => s.quantity_available === 0).length
  const expiringSoon = data.filter((s) => {
    const exp = new Date(s.expiry_date)
    return exp <= in60Days && exp >= today
  }).length

  return { total, lowStock, outOfStock, expiringSoon }
}

export async function getStockBatchNumbers() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("stocks")
    .select("medicine_name, batch_number, mrp, expiry_date, quantity_available")
    .gt("quantity_available", 0)
    .order("medicine_name")

  if (error) return []
  return data ?? []
}
