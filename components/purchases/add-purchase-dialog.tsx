"use client"

import { useActionState, useEffect, useRef } from "react"
import { toast } from "sonner"
import { addPurchase, type PurchaseActionState } from "@/lib/actions/purchases"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus } from "lucide-react"
import { useState } from "react"

const initialState: PurchaseActionState = { success: false, message: "" }

export function AddPurchaseDialog() {
  const [open, setOpen] = useState(false)
  const [state, formAction, pending] = useActionState(addPurchase, initialState)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state.message) {
      if (state.success) {
        toast.success(state.message)
        formRef.current?.reset()
        setOpen(false)
      } else {
        toast.error(state.message)
      }
    }
  }, [state])

  const today = new Date().toISOString().split("T")[0]

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Add Purchase
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record New Purchase</DialogTitle>
        </DialogHeader>
        <form ref={formRef} action={formAction} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1">
              <Label htmlFor="medicine_name">Medicine Name</Label>
              <Input id="medicine_name" name="medicine_name" placeholder="e.g. Paracetamol 500mg" required />
              {state.errors?.medicine_name && (
                <p className="text-xs text-destructive">{state.errors.medicine_name[0]}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="batch_number">Batch Number</Label>
              <Input id="batch_number" name="batch_number" placeholder="e.g. BT-2025-001" required />
              {state.errors?.batch_number && (
                <p className="text-xs text-destructive">{state.errors.batch_number[0]}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="quantity_bought">Quantity</Label>
              <Input id="quantity_bought" name="quantity_bought" type="number" min="1" placeholder="100" required />
              {state.errors?.quantity_bought && (
                <p className="text-xs text-destructive">{state.errors.quantity_bought[0]}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="mrp">MRP (₹)</Label>
              <Input id="mrp" name="mrp" type="number" step="0.01" min="0.01" placeholder="10.00" required />
              {state.errors?.mrp && (
                <p className="text-xs text-destructive">{state.errors.mrp[0]}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="expiry_date">Expiry Date</Label>
              <Input id="expiry_date" name="expiry_date" type="date" required />
              {state.errors?.expiry_date && (
                <p className="text-xs text-destructive">{state.errors.expiry_date[0]}</p>
              )}
            </div>

            <div className="col-span-2 space-y-1">
              <Label htmlFor="purchase_date">Purchase Date</Label>
              <Input id="purchase_date" name="purchase_date" type="date" defaultValue={today} required />
              {state.errors?.purchase_date && (
                <p className="text-xs text-destructive">{state.errors.purchase_date[0]}</p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Record Purchase"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
