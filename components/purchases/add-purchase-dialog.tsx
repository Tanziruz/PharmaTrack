"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { addPurchase } from "@/lib/actions/purchases"
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
import { Plus, Trash2 } from "lucide-react"
import type { Party } from "@/lib/types/database"
import { MedicineScanner } from "@/components/ui/medicine-scanner"
import type { PackagingScanResult } from "@/lib/utils/ocr-extract"
import { Separator } from "@/components/ui/separator"

interface PurchaseEntry {
  key: string
  medicine_name: string
  batch_number: string
  quantity_bought: string
  mrp: string
  expiry_date: string
}

function createEntry(): PurchaseEntry {
  return {
    key: crypto.randomUUID(),
    medicine_name: "",
    batch_number: "",
    quantity_bought: "",
    mrp: "",
    expiry_date: "",
  }
}

interface AddPurchaseDialogProps {
  parties: Party[]
}

export function AddPurchaseDialog({ parties }: AddPurchaseDialogProps) {
  const [open, setOpen] = useState(false)
  const [supplierName, setSupplierName] = useState("")
  const [purchaseDate, setPurchaseDate] = useState("")
  const [entries, setEntries] = useState<PurchaseEntry[]>([createEntry()])
  const [isPending, startTransition] = useTransition()

  const today = new Date().toISOString().split("T")[0]

  const reset = () => {
    setSupplierName("")
    setPurchaseDate("")
    setEntries([createEntry()])
  }

  const updateEntry = (key: string, field: keyof PurchaseEntry, value: string) => {
    setEntries((prev) =>
      prev.map((e) => (e.key === key ? { ...e, [field]: value } : e)),
    )
  }

  const removeEntry = (key: string) => {
    setEntries((prev) => prev.filter((e) => e.key !== key))
  }

  const addEntry = () => {
    setEntries((prev) => [...prev, createEntry()])
  }

  const handleScanResult = (key: string, result: PackagingScanResult) => {
    setEntries((prev) =>
      prev.map((e) => {
        if (e.key !== key) return e
        return {
          ...e,
          batch_number: result.batch_number ?? e.batch_number,
          expiry_date: result.expiry_date ?? e.expiry_date,
          mrp: result.mrp ?? e.mrp,
        }
      }),
    )
  }

  const handleSubmit = () => {
    startTransition(async () => {
      const date = purchaseDate || today
      const results = await Promise.all(
        entries.map(async (entry) => {
          const fd = new FormData()
          fd.set("medicine_name", entry.medicine_name)
          fd.set("batch_number", entry.batch_number)
          fd.set("mrp", entry.mrp)
          fd.set("expiry_date", entry.expiry_date)
          fd.set("quantity_bought", entry.quantity_bought)
          fd.set("purchase_date", date)
          fd.set("supplier_name", supplierName)
          return addPurchase({ success: false, message: "" }, fd)
        }),
      )

      const successes = results.filter((r) => r.success).length
      const failures = results.filter((r) => !r.success).length

      if (successes > 0) {
        toast.success(
          `${successes} purchase${successes > 1 ? "s" : ""} recorded.`,
        )
      }
      if (failures > 0) {
        const firstError =
          results.find((r) => !r.success)?.message || "Some entries failed."
        toast.error(
          `${failures} item${failures > 1 ? "s" : ""} failed: ${firstError}`,
        )
      }
      if (failures === 0) {
        reset()
        setOpen(false)
      }
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v)
        if (!v) reset()
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Add Purchase
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Record New Purchase</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 overflow-y-auto flex-1 pr-1">
          {/* Shared fields */}
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
              <Label>Purchase Date</Label>
              <Input
                type="date"
                value={purchaseDate || today}
                onChange={(e) => setPurchaseDate(e.target.value)}
              />
            </div>
          </div>

          <Separator />

          {/* Entry rows */}
          {entries.map((entry, i) => (
            <div key={entry.key} className="rounded-lg border p-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Item {i + 1}</span>
                <div className="flex items-center gap-1">
                  <MedicineScanner
                    onResult={(r) => handleScanResult(entry.key, r)}
                  />
                  {entries.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => removeEntry(entry.key)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1">
                  <Label>Medicine Name</Label>
                  <Input
                    placeholder="e.g. Paracetamol 500mg"
                    value={entry.medicine_name}
                    onChange={(e) =>
                      updateEntry(entry.key, "medicine_name", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Batch Number</Label>
                  <Input
                    placeholder="e.g. BT-2025-001"
                    value={entry.batch_number}
                    onChange={(e) =>
                      updateEntry(entry.key, "batch_number", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    min="1"
                    placeholder="100"
                    value={entry.quantity_bought}
                    onChange={(e) =>
                      updateEntry(entry.key, "quantity_bought", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>MRP (₹)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="10.00"
                    value={entry.mrp}
                    onChange={(e) =>
                      updateEntry(entry.key, "mrp", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Expiry (Month/Year)</Label>
                  <Input
                    type="month"
                    value={entry.expiry_date}
                    onChange={(e) =>
                      updateEntry(entry.key, "expiry_date", e.target.value)
                    }
                  />
                </div>
              </div>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            onClick={addEntry}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Another Item
          </Button>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending
              ? "Saving…"
              : `Record ${entries.length} Purchase${entries.length > 1 ? "s" : ""}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
