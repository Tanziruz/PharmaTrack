"use client"

import { useActionState, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { addManualOrder, type ToOrderActionState } from "@/lib/actions/to-order"
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
import { Textarea } from "@/components/ui/textarea"
import { Plus } from "lucide-react"

const initialState: ToOrderActionState = { success: false, message: "" }

export function AddManualOrderDialog() {
  const [open, setOpen] = useState(false)
  const [state, formAction, pending] = useActionState(addManualOrder, initialState)
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="h-4 w-4 mr-1" />
          Add Manually
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add to Order List</DialogTitle>
        </DialogHeader>
        <form ref={formRef} action={formAction} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="medicine_name">Medicine Name</Label>
            <Input
              id="medicine_name"
              name="medicine_name"
              placeholder="e.g. Paracetamol 500mg"
              required
            />
            {state.errors?.medicine_name && (
              <p className="text-xs text-destructive">{state.errors.medicine_name[0]}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="batch_number">Batch Number (optional)</Label>
            <Input
              id="batch_number"
              name="batch_number"
              placeholder="e.g. BT-2025-001"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="quantity_needed">Quantity to Order (optional)</Label>
            <Input
              id="quantity_needed"
              name="quantity_needed"
              type="number"
              min="0"
              placeholder="e.g. 100"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              name="notes"
              placeholder="e.g. Need 200 units by Friday"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Adding…" : "Add to List"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
