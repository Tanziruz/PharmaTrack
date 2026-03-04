"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/utils/supabase/server"
import { recalculateStockAndOrders } from "@/lib/actions/stocks"

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

function revalidateAll() {
  revalidatePath("/purchases")
  revalidatePath("/sales")
  revalidatePath("/stocks")
  revalidatePath("/to-order")
  revalidatePath("/")
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
    // Check available stock before selling
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

  // Recalculate stock from scratch for this batch
  await recalculateStockAndOrders(supabase, parsed.data.batch_number, parsed.data.medicine_name, parsed.data.mrp, parsed.data.expiry_date)

  revalidateAll()
  return { success: true, message: "Sale recorded successfully." }
}

export async function editSale(
  _prev: SaleActionState,
  formData: FormData,
): Promise<SaleActionState> {
  const id = formData.get("id") as string
  if (!id) return { success: false, message: "Missing sale ID." }

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

  // Get old sale to know old batch (in case batch changed)
  const { data: oldSale } = await supabase.from("sales").select("*").eq("id", id).single()
  if (!oldSale) return { success: false, message: "Sale not found." }

  // Validate new quantity won't exceed stock (compute: total_bought - total_other_sales)
  const { data: purchases } = await supabase
    .from("purchases")
    .select("quantity_bought")
    .eq("batch_number", parsed.data.batch_number)

  const totalBought = (purchases ?? []).reduce(
    (sum: number, p: { quantity_bought: number }) => sum + p.quantity_bought, 0,
  )

  const { data: otherSales } = await supabase
    .from("sales")
    .select("quantity_sold")
    .eq("batch_number", parsed.data.batch_number)
    .neq("id", id)

  const totalOtherSold = (otherSales ?? []).reduce(
    (sum: number, s: { quantity_sold: number }) => sum + s.quantity_sold, 0,
  )

  const available = totalBought - totalOtherSold
  if (parsed.data.quantity_sold > available) {
    return {
      success: false,
      message: `Only ${available} units available for this batch (after other sales).`,
    }
  }

  const { error } = await supabase.from("sales").update(parsed.data).eq("id", id)
  if (error) return { success: false, message: `Database error: ${error.message}` }

  // Recalculate for old batch (if batch changed)
  if (oldSale.batch_number !== parsed.data.batch_number) {
    await recalculateStockAndOrders(supabase, oldSale.batch_number, oldSale.medicine_name, oldSale.mrp, oldSale.expiry_date)
  }

  // Recalculate for current batch
  await recalculateStockAndOrders(supabase, parsed.data.batch_number, parsed.data.medicine_name, parsed.data.mrp, parsed.data.expiry_date)

  revalidateAll()
  return { success: true, message: "Sale updated successfully." }
}

export async function deleteSale(id: string): Promise<SaleActionState> {
  const supabase = await createClient()

  const { data: sale } = await supabase.from("sales").select("*").eq("id", id).single()
  if (!sale) return { success: false, message: "Sale not found." }

  const { error } = await supabase.from("sales").delete().eq("id", id)
  if (error) return { success: false, message: `Database error: ${error.message}` }

  await recalculateStockAndOrders(supabase, sale.batch_number, sale.medicine_name, sale.mrp, sale.expiry_date)

  revalidateAll()
  return { success: true, message: "Sale deleted." }
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
