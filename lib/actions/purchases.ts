"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/utils/supabase/server"

const PurchaseSchema = z.object({
  medicine_name:   z.string().min(1, "Medicine name is required"),
  batch_number:    z.string().min(1, "Batch number is required"),
  mrp:             z.coerce.number().positive("MRP must be positive"),
  expiry_date:     z.string().min(1, "Expiry date is required"),
  quantity_bought: z.coerce.number().int().positive("Quantity must be a positive integer"),
  purchase_date:   z.string().min(1, "Purchase date is required"),
})

export type PurchaseActionState = {
  success: boolean
  message: string
  errors?: Record<string, string[]>
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

  revalidatePath("/purchases")
  revalidatePath("/stocks")
  revalidatePath("/to-order")
  revalidatePath("/")

  return { success: true, message: "Purchase recorded successfully." }
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
