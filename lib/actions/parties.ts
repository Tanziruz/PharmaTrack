"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/utils/supabase/server"

const AddPartySchema = z.object({
  name: z.string().min(1, "Party name is required").max(120),
})

export type PartyActionState = {
  success: boolean
  message: string
  errors?: Record<string, string[]>
}

export async function addParty(
  _prev: PartyActionState,
  formData: FormData,
): Promise<PartyActionState> {
  const raw = { name: formData.get("name") }
  const parsed = AddPartySchema.safeParse(raw)
  if (!parsed.success) {
    return {
      success: false,
      message: "Validation failed.",
      errors: parsed.error.flatten().fieldErrors,
    }
  }

  const supabase = await createClient()
  const { error } = await supabase.from("parties").insert({ name: parsed.data.name })

  if (error) {
    if (error.code === "23505") {
      return { success: false, message: `"${parsed.data.name}" already exists.` }
    }
    return { success: false, message: `Database error: ${error.message}` }
  }

  revalidatePath("/parties")
  revalidatePath("/purchases")
  return { success: true, message: `Party "${parsed.data.name}" added.` }
}

export async function deleteParty(id: string): Promise<PartyActionState> {
  const supabase = await createClient()
  const { error } = await supabase.from("parties").delete().eq("id", id)
  if (error) return { success: false, message: `Database error: ${error.message}` }
  revalidatePath("/parties")
  revalidatePath("/purchases")
  return { success: true, message: "Party deleted." }
}

export async function getParties() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("parties")
    .select("*")
    .order("name", { ascending: true })
  if (error) return []
  return data ?? []
}
