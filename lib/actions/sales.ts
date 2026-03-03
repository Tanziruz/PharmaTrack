"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/utils/supabase/server"

const SaleSchema = z.object({
  medicine_name: z.string().min(1, "Medicine name is required"),
  batch_number:  z.string().min(1, "Batch number is required"),
  mrp:           z.coerce.number().positive("MRP must be positive"),
  selling_price: z.coerce.number().positive("Selling price must be positive"),
  expiry_date:   z.string().min(1, "Expiry date is required"),
  quantity_sold: z.coerce.number().int().positive("Quantity must be a positive integer"),
  sale_date:     z.string().min(1, "Sale date is required"),
})

export type SaleActionState = {
  success: boolean
  message: string
  errors?: Record<string, string[]>
}

export async function recordSale(
  _prev: SaleActionState,
  formData: FormData,
): Promise<SaleActionState> {
  const raw = {
    medicine_name: formData.get("medicine_name"),
    batch_number:  formData.get("batch_number"),
    mrp:           formData.get("mrp"),
    selling_price: formData.get("selling_price"),
    expiry_date:   formData.get("expiry_date"),
    quantity_sold: formData.get("quantity_sold"),
    sale_date:     formData.get("sale_date"),
  }

  const parsed = SaleSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      success: false,
      message: "Validation failed.",
      errors: parsed.error.flatten().fieldErrors,
    }
  }

  const supabase = await createClient()
  const isManual = formData.get("manual_entry") === "true"

  if (!isManual) {
    // Check available stock only when selecting from existing stock
    const { data: stock } = await supabase
      .from("stocks")
      .select("quantity_available")
      .eq("batch_number", parsed.data.batch_number)
      .single()

    if (!stock) {
      return { success: false, message: "Batch not found in stock. Record a purchase first." }
    }

    if (stock.quantity_available < parsed.data.quantity_sold) {
      return {
        success: false,
        message: `Only ${stock.quantity_available} units available for this batch.`,
      }
    }
  }

  const { error } = await supabase.from("sales").insert(parsed.data)

  if (error) {
    return { success: false, message: `Database error: ${error.message}` }
  }

  revalidatePath("/sales")
  revalidatePath("/stocks")
  revalidatePath("/to-order")
  revalidatePath("/")

  return { success: true, message: "Sale recorded successfully." }
}

export async function getSales() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("sales")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) throw new Error(error.message)
  return data
}

export async function getTodaySalesTotal() {
  const supabase = await createClient()

  const today = new Date().toISOString().split("T")[0]

  const { data, error } = await supabase
    .from("sales")
    .select("selling_price, quantity_sold")
    .eq("sale_date", today)

  if (error) return 0

  return (data ?? []).reduce(
    (sum, s) => sum + s.selling_price * s.quantity_sold,
    0,
  )
}
