"use client"

import { useActionState, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { editSale, type SaleActionState } from "@/lib/actions/sales"
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
import { Pencil } from "lucide-react"
import type { Sale } from "@/lib/types/database"

const initialState: SaleActionState = { success: false, message: "" }

interface EditSaleDialogProps {
  sale: Sale
}

export function EditSaleDialog({ sale }: EditSaleDialogProps) {
  const [open, setOpen] = useState(false)
  const [state, formAction, pending] = useActionState(editSale, initialState)
  const formRef = useRef<HTMLFormElement>(null)

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
          <DialogTitle>Edit Sale</DialogTitle>
        </DialogHeader>
        <form ref={formRef} action={formAction} className="space-y-4">
          <input type="hidden" name="id" value={sale.id} />
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1">
              <Label htmlFor={`medicine_name_${sale.id}`}>Medicine Name</Label>
              <Input
                id={`medicine_name_${sale.id}`}
                name="medicine_name"
                defaultValue={sale.medicine_name}
                required
              />
              {state.errors?.medicine_name && (
                <p className="text-xs text-destructive">{state.errors.medicine_name[0]}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor={`batch_number_${sale.id}`}>Batch Number</Label>
              <Input
                id={`batch_number_${sale.id}`}
                name="batch_number"
                defaultValue={sale.batch_number}
                required
              />
              {state.errors?.batch_number && (
                <p className="text-xs text-destructive">{state.errors.batch_number[0]}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor={`quantity_sold_${sale.id}`}>Quantity Sold</Label>
              <Input
                id={`quantity_sold_${sale.id}`}
                name="quantity_sold"
                type="number"
                min="1"
                defaultValue={sale.quantity_sold}
                required
              />
              {state.errors?.quantity_sold && (
                <p className="text-xs text-destructive">{state.errors.quantity_sold[0]}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor={`mrp_${sale.id}`}>MRP (₹)</Label>
              <Input
                id={`mrp_${sale.id}`}
                name="mrp"
                type="number"
                step="0.01"
                min="0.01"
                defaultValue={Number(sale.mrp).toFixed(2)}
                required
              />
              {state.errors?.mrp && (
                <p className="text-xs text-destructive">{state.errors.mrp[0]}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor={`selling_price_${sale.id}`}>Selling Price (₹)</Label>
              <Input
                id={`selling_price_${sale.id}`}
                name="selling_price"
                type="number"
                step="0.01"
                min="0.01"
                defaultValue={Number(sale.selling_price).toFixed(2)}
                required
              />
              {state.errors?.selling_price && (
                <p className="text-xs text-destructive">{state.errors.selling_price[0]}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor={`expiry_date_${sale.id}`}>Expiry (Month/Year)</Label>
              <Input
                id={`expiry_date_${sale.id}`}
                name="expiry_date"
                type="month"
                defaultValue={sale.expiry_date.slice(0, 7)}
                required
              />
              {state.errors?.expiry_date && (
                <p className="text-xs text-destructive">{state.errors.expiry_date[0]}</p>
              )}
            </div>

            <div className="col-span-2 space-y-1">
              <Label htmlFor={`sale_date_${sale.id}`}>Sale Date</Label>
              <Input
                id={`sale_date_${sale.id}`}
                name="sale_date"
                type="date"
                defaultValue={sale.sale_date}
                required
              />
              {state.errors?.sale_date && (
                <p className="text-xs text-destructive">{state.errors.sale_date[0]}</p>
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
