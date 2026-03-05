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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus } from "lucide-react"
import { useState } from "react"
import type { Party } from "@/lib/types/database"
import { MedicineScanner } from "@/components/ui/medicine-scanner"
import type { PackagingScanResult } from "@/lib/utils/ocr-extract"

const initialState: PurchaseActionState = { success: false, message: "" }

interface AddPurchaseDialogProps {
  parties: Party[]
}

export function AddPurchaseDialog({ parties }: AddPurchaseDialogProps) {
  const [open, setOpen] = useState(false)
  const [state, formAction, pending] = useActionState(addPurchase, initialState)
  const formRef = useRef<HTMLFormElement>(null)
  const [supplierName, setSupplierName] = useState("")
  const [batchNumber, setBatchNumber] = useState("")
  const [expiryDate, setExpiryDate] = useState("")
  const [mrp, setMrp] = useState("")

  const handleScanResult = (result: PackagingScanResult) => {
    if (result.batch_number) setBatchNumber(result.batch_number)
    if (result.expiry_date) setExpiryDate(result.expiry_date)
    if (result.mrp) setMrp(result.mrp)
  }

  useEffect(() => {
    if (state.message) {
      if (state.success) {
        toast.success(state.message)
        formRef.current?.reset()
        setSupplierName("")
        setBatchNumber("")
        setExpiryDate("")
        setMrp("")
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
          <div className="flex items-center justify-between">
            <DialogTitle>Record New Purchase</DialogTitle>
            <MedicineScanner onResult={handleScanResult} />
          </div>
        </DialogHeader>
        <form ref={formRef} action={formAction} className="space-y-4">
          {/* hidden supplier name so server action can read it */}
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
              <Label htmlFor="medicine_name">Medicine Name</Label>
              <Input id="medicine_name" name="medicine_name" placeholder="e.g. Paracetamol 500mg" required />
              {state.errors?.medicine_name && (
                <p className="text-xs text-destructive">{state.errors.medicine_name[0]}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="batch_number">Batch Number</Label>
              <Input id="batch_number" name="batch_number" placeholder="e.g. BT-2025-001" value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} required />
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
              <Input id="mrp" name="mrp" type="number" step="0.01" min="0.01" placeholder="10.00" value={mrp} onChange={(e) => setMrp(e.target.value)} required />
              {state.errors?.mrp && (
                <p className="text-xs text-destructive">{state.errors.mrp[0]}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="expiry_date">Expiry Date</Label>
              <Input id="expiry_date" name="expiry_date" type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} required />
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
