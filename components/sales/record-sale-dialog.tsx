"use client"

import { useActionState, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { recordSale, type SaleActionState } from "@/lib/actions/sales"
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Check, ChevronDown, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { MedicineScanner } from "@/components/ui/medicine-scanner"
import type { PackagingScanResult } from "@/lib/utils/ocr-extract"

interface StockOption {
  medicine_name: string
  batch_number: string
  mrp: number
  expiry_date: string
  quantity_available: number
}

interface RecordSaleDialogProps {
  stocks: StockOption[]
}

const initialState: SaleActionState = { success: false, message: "" }

type Mode = "stock" | "manual"

export function RecordSaleDialog({ stocks }: RecordSaleDialogProps) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<Mode>("stock")
  const [state, formAction, pending] = useActionState(recordSale, initialState)
  const formRef = useRef<HTMLFormElement>(null)

  // stock-mode auto-fill state
  const [selectedBatch, setSelectedBatch] = useState("")
  const [autoMrp, setAutoMrp] = useState("")
  const [autoExpiry, setAutoExpiry] = useState("")
  const [autoMedicineName, setAutoMedicineName] = useState("")

  // combobox state
  const [comboOpen, setComboOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  // manual mode batch from scanner
  const [manualBatch, setManualBatch] = useState("")

  const resetForm = () => {
    formRef.current?.reset()
    setSelectedBatch("")
    setAutoMrp("")
    setAutoExpiry("")
    setAutoMedicineName("")
    setSearchQuery("")
    setComboOpen(false)
    setManualBatch("")
  }

  useEffect(() => {
    if (state.message) {
      if (state.success) {
        toast.success(state.message)
        resetForm()
        setOpen(false)
      } else {
        toast.error(state.message)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  const handleBatchSelect = (value: string) => {
    setSelectedBatch(value)
    setComboOpen(false)
    setSearchQuery("")
    const stock = stocks.find((s) => s.batch_number === value)
    if (stock) {
      setAutoMrp(String(stock.mrp))
      setAutoExpiry(stock.expiry_date)
      setAutoMedicineName(stock.medicine_name)
    }
  }

  const handleScanResult = (result: PackagingScanResult) => {
    if (!result.batch_number) {
      toast.error("Batch number not found on packaging.")
      return
    }
    const match = stocks.find(
      (s) => s.batch_number.toLowerCase() === result.batch_number!.toLowerCase(),
    )
    if (match) {
      setMode("stock")
      handleBatchSelect(match.batch_number)
    } else {
      setMode("manual")
      setManualBatch(result.batch_number)
      toast.info("Batch not in stock — switched to manual entry.")
    }
  }

  const handleOpenChange = (v: boolean) => {
    setOpen(v)
    if (!v) resetForm()
  }

  const today = new Date().toISOString().split("T")[0]

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Record Sale
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Record Sale</DialogTitle>
            <MedicineScanner onResult={handleScanResult} />
          </div>
        </DialogHeader>

        {/* Mode toggle */}
        <div className="flex rounded-md border overflow-hidden text-sm">
          {(["stock", "manual"] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => { setMode(m); resetForm() }}
              className={cn(
                "flex-1 px-3 py-1.5 font-medium transition-colors",
                mode === m
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:bg-muted",
              )}
            >
              {m === "stock" ? "Select from Stock" : "Enter Manually"}
            </button>
          ))}
        </div>

        <form ref={formRef} action={formAction} className="space-y-4">
          {/* Tell server which mode we're in */}
          <input type="hidden" name="manual_entry" value={mode === "manual" ? "true" : "false"} />

          {mode === "stock" ? (
            <>
              {/* Hidden fields auto-filled from batch selection */}
              <input type="hidden" name="medicine_name" value={autoMedicineName} />
              <input type="hidden" name="mrp" value={autoMrp} />
              <input type="hidden" name="expiry_date" value={autoExpiry} />
              <input type="hidden" name="batch_number" value={selectedBatch} />

              <div className="space-y-1">
                <Label>Batch / Medicine</Label>
                <Popover open={comboOpen} onOpenChange={setComboOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      aria-expanded={comboOpen}
                      className="w-full justify-between font-normal"
                    >
                      {selectedBatch
                        ? `${autoMedicineName} — ${selectedBatch}`
                        : "Select a batch…"}
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                    <div className="p-2 border-b">
                      <Input
                        autoFocus
                        placeholder="Search medicine or batch…"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <ul className="max-h-56 overflow-y-auto py-1">
                      {stocks
                        .filter((s) => {
                          const q = searchQuery.toLowerCase()
                          return (
                            s.medicine_name.toLowerCase().includes(q) ||
                            s.batch_number.toLowerCase().includes(q)
                          )
                        })
                        .map((s) => (
                          <li key={s.batch_number}>
                            <button
                              type="button"
                              onClick={() => handleBatchSelect(s.batch_number)}
                              className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent"
                            >
                              <Check
                                className={cn(
                                  "h-3 w-3 shrink-0",
                                  selectedBatch === s.batch_number ? "opacity-100" : "opacity-0",
                                )}
                              />
                              <span className="flex-1 text-left">
                                {s.medicine_name}{" "}
                                <span className="text-muted-foreground text-xs">— {s.batch_number} ({s.quantity_available} left)</span>
                              </span>
                            </button>
                          </li>
                        ))}
                      {stocks.filter((s) => {
                        const q = searchQuery.toLowerCase()
                        return s.medicine_name.toLowerCase().includes(q) || s.batch_number.toLowerCase().includes(q)
                      }).length === 0 && (
                        <li className="px-3 py-2 text-sm text-muted-foreground">No matches found.</li>
                      )}
                    </ul>
                  </PopoverContent>
                </Popover>
                {state.errors?.batch_number && (
                  <p className="text-xs text-destructive">{state.errors.batch_number[0]}</p>
                )}
              </div>

              {selectedBatch && (
                <div className="rounded-md bg-muted px-3 py-2 text-sm space-y-0.5">
                  <p><span className="font-medium">Medicine:</span> {autoMedicineName}</p>
                  <p><span className="font-medium">MRP:</span> ₹{autoMrp}</p>
                  <p><span className="font-medium">Expiry:</span> {autoExpiry}</p>
                </div>
              )}
            </>
          ) : (
            /* ── Manual Entry fields ── */
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
                <Input id="batch_number" name="batch_number" placeholder="e.g. BT-2025-001" value={manualBatch} onChange={(e) => setManualBatch(e.target.value)} required />
                {state.errors?.batch_number && (
                  <p className="text-xs text-destructive">{state.errors.batch_number[0]}</p>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="mrp">MRP (₹)</Label>
                <Input id="mrp" name="mrp" type="number" step="0.01" min="0.01" placeholder="10.00" required />
                {state.errors?.mrp && (
                  <p className="text-xs text-destructive">{state.errors.mrp[0]}</p>
                )}
              </div>

              <div className="col-span-2 space-y-1">
                <Label htmlFor="expiry_date">Expiry Date</Label>
                <Input id="expiry_date" name="expiry_date" type="date" required />
                {state.errors?.expiry_date && (
                  <p className="text-xs text-destructive">{state.errors.expiry_date[0]}</p>
                )}
              </div>

              <p className="col-span-2 text-xs text-muted-foreground bg-muted rounded px-2 py-1.5">
                If this batch exists in inventory, its stock will be decremented automatically.
              </p>
            </div>
          )}

          {/* Common fields for both modes */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="quantity_sold">Quantity to Sell</Label>
              <Input
                id="quantity_sold"
                name="quantity_sold"
                type="number"
                min="1"
                placeholder="1"
                required
              />
              {state.errors?.quantity_sold && (
                <p className="text-xs text-destructive">{state.errors.quantity_sold[0]}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="selling_price">Selling Price (₹)</Label>
              <Input
                id="selling_price"
                name="selling_price"
                type="number"
                step="0.01"
                min="0.01"
                placeholder={autoMrp || "0.00"}
                required
              />
              {state.errors?.selling_price && (
                <p className="text-xs text-destructive">{state.errors.selling_price[0]}</p>
              )}
            </div>

            <div className="col-span-2 space-y-1">
              <Label htmlFor="sale_date">Sale Date</Label>
              <Input
                id="sale_date"
                name="sale_date"
                type="date"
                defaultValue={today}
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
            <Button
              type="submit"
              disabled={pending || (mode === "stock" && !selectedBatch)}
            >
              {pending ? "Saving…" : "Record Sale"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

