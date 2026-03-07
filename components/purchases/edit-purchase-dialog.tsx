"use client"

import { useActionState, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { editPurchase, type PurchaseActionState } from "@/lib/actions/purchases"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Pencil } from "lucide-react"
import type { Purchase, Party } from "@/lib/types/database"

const initialState: PurchaseActionState = { success: false, message: "" }

interface EditPurchaseDialogProps {
  purchase: Purchase
  parties: Party[]
}

export function EditPurchaseDialog({ purchase, parties }: EditPurchaseDialogProps) {
  const [open, setOpen] = useState(false)
  const [state, formAction, pending] = useActionState(editPurchase, initialState)
  const formRef = useRef<HTMLFormElement>(null)
  const [supplierName, setSupplierName] = useState(purchase.supplier_name ?? "")

  useEffect(() => {
    if (state.message) {
      if (state.success) {
        toast.success(state.message)
        setOpen(false)
      } else {
        toast.error(state.message)
      }
    }
  }, [state])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" className="h-7 w-7">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Purchase</DialogTitle>
        </DialogHeader>
        <form ref={formRef} action={formAction} className="space-y-4">
          <input type="hidden" name="id" value={purchase.id} />
          <input type="hidden" name="supplier_name" value={supplierName} />
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1">
              <Label>Supplier / Party</Label>
              <Select value={supplierName} onValueChange={setSupplierName}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a party (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {parties.map((p) => (
                    <SelectItem key={p.id} value={p.name}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2 space-y-1">
              <Label htmlFor={`medicine_name_${purchase.id}`}>Medicine Name</Label>
              <Input
                id={`medicine_name_${purchase.id}`}
                name="medicine_name"
                defaultValue={purchase.medicine_name}
                required
              />
              {state.errors?.medicine_name && (
                <p className="text-xs text-destructive">{state.errors.medicine_name[0]}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor={`batch_number_${purchase.id}`}>Batch Number</Label>
              <Input
                id={`batch_number_${purchase.id}`}
                name="batch_number"
                defaultValue={purchase.batch_number}
                required
              />
              {state.errors?.batch_number && (
                <p className="text-xs text-destructive">{state.errors.batch_number[0]}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor={`quantity_bought_${purchase.id}`}>Quantity</Label>
              <Input
                id={`quantity_bought_${purchase.id}`}
                name="quantity_bought"
                type="number"
                min="1"
                defaultValue={purchase.quantity_bought}
                required
              />
              {state.errors?.quantity_bought && (
                <p className="text-xs text-destructive">{state.errors.quantity_bought[0]}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor={`mrp_${purchase.id}`}>MRP (₹)</Label>
              <Input
                id={`mrp_${purchase.id}`}
                name="mrp"
                type="number"
                step="0.01"
                min="0.01"
                defaultValue={Number(purchase.mrp).toFixed(2)}
                required
              />
              {state.errors?.mrp && (
                <p className="text-xs text-destructive">{state.errors.mrp[0]}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor={`expiry_date_${purchase.id}`}>Expiry (Month/Year)</Label>
              <Input
                id={`expiry_date_${purchase.id}`}
                name="expiry_date"
                type="month"
                defaultValue={purchase.expiry_date.slice(0, 7)}
                required
              />
              {state.errors?.expiry_date && (
                <p className="text-xs text-destructive">{state.errors.expiry_date[0]}</p>
              )}
            </div>

            <div className="col-span-2 space-y-1">
              <Label htmlFor={`purchase_date_${purchase.id}`}>Purchase Date</Label>
              <Input
                id={`purchase_date_${purchase.id}`}
                name="purchase_date"
                type="date"
                defaultValue={purchase.purchase_date}
                required
              />
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
              {pending ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
