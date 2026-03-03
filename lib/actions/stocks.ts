"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/utils/supabase/server"

const UpdateReorderLevelSchema = z.object({
  id:            z.string().uuid(),
  reorder_level: z.coerce.number().int().min(0),
})

export type StockActionState = {
  success: boolean
  message: string
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
