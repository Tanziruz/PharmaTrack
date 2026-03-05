"use server"

import { cache } from "@/lib/cache"
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

  // Both reads are independent — run in parallel
  const [{ data: expiredStocks }, { data: pendingExpiredEntries }] = await Promise.all([
    supabase
      .from("stocks")
      .select("medicine_name, batch_number, quantity_available, supplier_name")
      .lt("expiry_date", today)
      .gt("quantity_available", 0),
    supabase
      .from("to_be_ordered")
      .select("id, batch_number")
      .eq("reason", "expiring_soon")
      .eq("is_ordered", false),
  ])

  const expiredBatches = new Set((expiredStocks ?? []).map((s) => s.batch_number))

  // Build a set of batches already in the table — checked in-memory, no per-row queries
  const alreadyTracked = new Set(
    (pendingExpiredEntries ?? [])
      .filter((e) => e.batch_number != null)
      .map((e) => e.batch_number as string),
  )

  // Batch-insert all missing expired entries in one query instead of a loop
  const toInsert = (expiredStocks ?? []).filter(
    (s) => !alreadyTracked.has(s.batch_number),
  )
  if (toInsert.length > 0) {
    await supabase.from("to_be_ordered").insert(
      toInsert.map((s) => ({
        medicine_name: s.medicine_name,
        batch_number: s.batch_number,
        reason: "expiring_soon",
        quantity_needed: s.quantity_available,
        supplier_name: s.supplier_name ?? null,
        notes: "Expired stock",
        is_ordered: false,
      })),
    )
  }

  // Batch-delete all stale entries in one query instead of a loop
  const staleIds = (pendingExpiredEntries ?? [])
    .filter((e) => !e.batch_number || !expiredBatches.has(e.batch_number))
    .map((e) => e.id)
  if (staleIds.length > 0) {
    await supabase.from("to_be_ordered").delete().in("id", staleIds)
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
  revalidatePath("/")

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
  revalidatePath("/stocks")
  revalidatePath("/")

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
  revalidatePath("/")

  return { success: true, message: "Entry removed." }
}

export const getToBeOrdered = cache(async () => {
  await syncExpiredEntries()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("to_be_ordered")
    .select("*")
    .order("created_at", { ascending: false })
  if (error) throw new Error(error.message)
  return data ?? []
})

// Derives from cached getToBeOrdered() — no extra DB query
export async function getPendingOrderCount() {
  const items = await getToBeOrdered()
  return items.filter((i) => !i.is_ordered).length
}
