export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// ─── Enums ────────────────────────────────────────────────────────────────────

export type ReorderReason =
  | "low_stock"
  | "out_of_stock"
  | "expiring_soon"
  | "manual"

// ─── Row types (what comes back from SELECT) ──────────────────────────────────

export interface Stock {
  id: string
  medicine_name: string
  batch_number: string
  mrp: number
  expiry_date: string          // ISO date string "YYYY-MM-DD"
  quantity_available: number
  reorder_level: number        // default 10
  created_at: string
  updated_at: string
}

export interface Purchase {
  id: string
  medicine_name: string
  batch_number: string
  mrp: number
  expiry_date: string
  quantity_bought: number
  purchase_date: string
  created_at: string
}

export interface Sale {
  id: string
  medicine_name: string
  batch_number: string
  mrp: number
  selling_price: number
  expiry_date: string
  quantity_sold: number
  sale_date: string
  created_at: string
}

export interface ToBeOrdered {
  id: string
  medicine_name: string
  batch_number: string | null
  reason: ReorderReason
  notes: string | null
  quantity_needed: number       // units that need to be reordered
  is_ordered: boolean
  created_at: string
}

// ─── Insert types (what you send on INSERT) ───────────────────────────────────

export type PurchaseInsert = Omit<Purchase, "id" | "created_at">

export type SaleInsert = Omit<Sale, "id" | "created_at">

export type ToBeOrderedInsert = Omit<ToBeOrdered, "id" | "created_at">

export type StockUpdate = Partial<
  Pick<Stock, "quantity_available" | "reorder_level" | "mrp" | "expiry_date" | "updated_at">
>

// ─── Supabase Database shape (for typed createClient<Database>()) ─────────────

export interface Database {
  public: {
    Tables: {
      stocks: {
        Row: Stock
        Insert: Omit<Stock, "id" | "created_at" | "updated_at"> & { id?: string }
        Update: StockUpdate
      }
      purchases: {
        Row: Purchase
        Insert: Omit<Purchase, "id" | "created_at"> & { id?: string }
        Update: Partial<Omit<Purchase, "id" | "created_at">>
      }
      sales: {
        Row: Sale
        Insert: Omit<Sale, "id" | "created_at"> & { id?: string }
        Update: Partial<Omit<Sale, "id" | "created_at">>
      }
      to_be_ordered: {
        Row: ToBeOrdered
        Insert: Omit<ToBeOrdered, "id" | "created_at"> & { id?: string }
        Update: Partial<Omit<ToBeOrdered, "id" | "created_at">>
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      reorder_reason: ReorderReason
    }
  }
}
