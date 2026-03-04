"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/utils/supabase/server"

const ManualAddSchema = z.object({
  medicine_name:   z.string().min(1, "Medicine name is required"),
  batch_number:    z.string().optional(),
  notes:           z.string().optional(),
  quantity_needed: z.coerce.number().int().min(0).optional(),
})

export type ToOrderActionState = {
  success: boolean
  message: string
  errors?: Record<string, string[]>
}

async function syncExpiredEntries() {
  const supabase = await createClient()
  const today = new Date().toISOString().split("T")[0]

  const { data: expiredStocks } = await supabase
    .from("stocks")
    .select("medicine_name, batch_number, quantity_available, supplier_name")
    .lt("expiry_date", today)
    .gt("quantity_available", 0)

  const expiredBatches = new Set((expiredStocks ?? []).map((s) => s.batch_number))

  const { data: pendingExpiredEntries } = await supabase
    .from("to_be_ordered")
    .select("id, batch_number")
    .eq("reason", "expiring_soon")
    .eq("is_ordered", false)

  // Build a set of batches already in the table — checked in-memory, no per-row queries
  const alreadyTracked = new Set(
    (pendingExpiredEntries ?? [])
      .filter((e) => e.batch_number != null)
      .map((e) => e.batch_number as string),
  )

  for (const stock of expiredStocks ?? []) {
    if (!alreadyTracked.has(stock.batch_number)) {
      await supabase.from("to_be_ordered").insert({
        medicine_name: stock.medicine_name,
        batch_number: stock.batch_number,
        reason: "expiring_soon",
        quantity_needed: stock.quantity_available,
        supplier_name: stock.supplier_name ?? null,
        notes: "Expired stock",
        is_ordered: false,
      })
    }
  }

  for (const entry of pendingExpiredEntries ?? []) {
    if (!entry.batch_number || !expiredBatches.has(entry.batch_number)) {
      await supabase.from("to_be_ordered").delete().eq("id", entry.id)
    }
  }
}

export async function addManualOrder(
  _prev: ToOrderActionState,
  formData: FormData,
): Promise<ToOrderActionState> {
  const raw = {
    medicine_name:   formData.get("medicine_name"),
    batch_number:    formData.get("batch_number") || undefined,
    notes:           formData.get("notes") || undefined,
    quantity_needed: formData.get("quantity_needed") || undefined,
  }

  const parsed = ManualAddSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      success: false,
      message: "Validation failed.",
      errors: parsed.error.flatten().fieldErrors,
    }
  }

  const supabase = await createClient()

  const { error } = await supabase.from("to_be_ordered").insert({
    medicine_name:   parsed.data.medicine_name,
    batch_number:    parsed.data.batch_number ?? null,
    notes:           parsed.data.notes ?? null,
    quantity_needed: parsed.data.quantity_needed ?? 0,
    reason:          "manual",
    is_ordered:      false,
  })

  if (error) {
    return { success: false, message: `Database error: ${error.message}` }
  }

  revalidatePath("/to-order")

  return { success: true, message: "Added to order list." }
}

export async function markAsOrdered(id: string): Promise<ToOrderActionState> {
  const supabase = await createClient()

  const { data: entry } = await supabase
    .from("to_be_ordered")
    .select("reason, batch_number")
    .eq("id", id)
    .single()

  if (entry?.reason === "expiring_soon" && entry.batch_number) {
    await supabase.from("stocks").delete().eq("batch_number", entry.batch_number)
  }

  const { error } = await supabase
    .from("to_be_ordered")
    .update({ is_ordered: true })
    .eq("id", id)

  if (error) {
    return { success: false, message: `Database error: ${error.message}` }
  }

  revalidatePath("/to-order")
  revalidatePath("/")
  revalidatePath("/stocks")

  return { success: true, message: "Marked as ordered." }
}

export async function undoMarkAsOrdered(id: string): Promise<ToOrderActionState> {
  const supabase = await createClient()

  const { error } = await supabase
    .from("to_be_ordered")
    .update({ is_ordered: false })
    .eq("id", id)

  if (error) {
    return { success: false, message: `Database error: ${error.message}` }
  }

  revalidatePath("/to-order")
  revalidatePath("/")

  return { success: true, message: "Moved back to pending." }
}

export async function deleteOrderEntry(id: string): Promise<ToOrderActionState> {
  const supabase = await createClient()

  const { error } = await supabase.from("to_be_ordered").delete().eq("id", id)

  if (error) {
    return { success: false, message: `Database error: ${error.message}` }
  }

  revalidatePath("/to-order")

  return { success: true, message: "Entry removed." }
}

export async function getToBeOrdered() {
  await syncExpiredEntries()

  const supabase = await createClient()

  const { data, error } = await supabase
    .from("to_be_ordered")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) throw new Error(error.message)
  return data
}

export async function getPendingOrderCount() {
  const supabase = await createClient()

  const { count, error } = await supabase
    .from("to_be_ordered")
    .select("*", { count: "exact", head: true })
    .eq("is_ordered", false)

  if (error) return 0
  return count ?? 0
}
