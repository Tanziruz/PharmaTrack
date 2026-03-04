"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/utils/supabase/server"
import { recalculateStockAndOrders } from "@/lib/actions/stocks"

const PurchaseSchema = z.object({
  medicine_name:   z.string().min(1, "Medicine name is required"),
  batch_number:    z.string().min(1, "Batch number is required"),
  mrp:             z.coerce.number().positive("MRP must be positive"),
  expiry_date:     z.string().min(1, "Expiry date is required"),
  quantity_bought: z.coerce.number().int().positive("Quantity must be a positive integer"),
  purchase_date:   z.string().min(1, "Purchase date is required"),
  supplier_name:   z.string().optional(),
})

export type PurchaseActionState = {
  success: boolean
  message: string
  errors?: Record<string, string[]>
}

function revalidateAll() {
  revalidatePath("/purchases")
  revalidatePath("/stocks")
  revalidatePath("/to-order")
  revalidatePath("/sales")
  revalidatePath("/")
}

export async function addPurchase(
  _prev: PurchaseActionState,
  formData: FormData,
): Promise<PurchaseActionState> {
  const raw = {
    medicine_name:   formData.get("medicine_name"),
    batch_number:    formData.get("batch_number"),
    mrp:             formData.get("mrp"),
    expiry_date:     formData.get("expiry_date"),
    quantity_bought: formData.get("quantity_bought"),
    purchase_date:   formData.get("purchase_date"),
    supplier_name:   formData.get("supplier_name") || undefined,
  }

  const parsed = PurchaseSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      success: false,
      message: "Validation failed.",
      errors: parsed.error.flatten().fieldErrors,
    }
  }

  const supabase = await createClient()

  const { error } = await supabase.from("purchases").insert(parsed.data)

  if (error) {
    return { success: false, message: `Database error: ${error.message}` }
  }

  // Recalculate stock from scratch for this batch
  await recalculateStockAndOrders(supabase, parsed.data.batch_number, parsed.data.medicine_name, parsed.data.mrp, parsed.data.expiry_date)

  revalidateAll()
  return { success: true, message: "Purchase recorded successfully." }
}

export async function editPurchase(
  _prev: PurchaseActionState,
  formData: FormData,
): Promise<PurchaseActionState> {
  const id = formData.get("id") as string
  if (!id) return { success: false, message: "Missing purchase ID." }

  const raw = {
    medicine_name:   formData.get("medicine_name"),
    batch_number:    formData.get("batch_number"),
    mrp:             formData.get("mrp"),
    expiry_date:     formData.get("expiry_date"),
    quantity_bought: formData.get("quantity_bought"),
    purchase_date:   formData.get("purchase_date"),
    supplier_name:   formData.get("supplier_name") || undefined,
  }

  const parsed = PurchaseSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      success: false,
      message: "Validation failed.",
      errors: parsed.error.flatten().fieldErrors,
    }
  }

  const supabase = await createClient()

  // Get old purchase to know old batch (in case batch changed)
  const { data: oldPurchase } = await supabase.from("purchases").select("*").eq("id", id).single()
  if (!oldPurchase) return { success: false, message: "Purchase not found." }

  const { error } = await supabase.from("purchases").update(parsed.data).eq("id", id)
  if (error) return { success: false, message: `Database error: ${error.message}` }

  // Recalculate stock for old batch (if batch changed)
  if (oldPurchase.batch_number !== parsed.data.batch_number) {
    await recalculateStockAndOrders(supabase, oldPurchase.batch_number, oldPurchase.medicine_name, oldPurchase.mrp, oldPurchase.expiry_date)
  }

  // Recalculate stock for current batch
  await recalculateStockAndOrders(supabase, parsed.data.batch_number, parsed.data.medicine_name, parsed.data.mrp, parsed.data.expiry_date)

  revalidateAll()
  return { success: true, message: "Purchase updated successfully." }
}

export async function deletePurchase(id: string): Promise<PurchaseActionState> {
  const supabase = await createClient()

  const { data: purchase } = await supabase.from("purchases").select("*").eq("id", id).single()
  if (!purchase) return { success: false, message: "Purchase not found." }

  const { error } = await supabase.from("purchases").delete().eq("id", id)
  if (error) return { success: false, message: `Database error: ${error.message}` }

  await recalculateStockAndOrders(supabase, purchase.batch_number, purchase.medicine_name, purchase.mrp, purchase.expiry_date)

  revalidateAll()
  return { success: true, message: "Purchase deleted." }
}

export async function getPurchases() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("purchases")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) throw new Error(error.message)
  return data
}
