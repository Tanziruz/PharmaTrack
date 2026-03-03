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

  const { error } = await supabase
    .from("to_be_ordered")
    .update({ is_ordered: true })
    .eq("id", id)

  if (error) {
    return { success: false, message: `Database error: ${error.message}` }
  }

  revalidatePath("/to-order")
  revalidatePath("/")

  return { success: true, message: "Marked as ordered." }
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
