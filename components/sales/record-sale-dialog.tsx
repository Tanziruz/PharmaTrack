"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { recordSale } from "@/lib/actions/sales"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Check, ChevronDown, Download, Plus, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { MedicineScanner } from "@/components/ui/medicine-scanner"
import type { PackagingScanResult } from "@/lib/utils/ocr-extract"
import { Separator } from "@/components/ui/separator"
import { generateBillPDF } from "@/lib/utils/generate-bill-pdf"

// ── Types ────────────────────────────────────────────────────────────────────

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

type Mode = "stock" | "manual"

interface SaleEntryData {
  key: string
  mode: Mode
  medicine_name: string
  batch_number: string
  mrp: string
  expiry_date: string
  quantity_sold: string
  selling_price: string
}

function createSaleEntry(): SaleEntryData {
  return {
    key: crypto.randomUUID(),
    mode: "stock",
    medicine_name: "",
    batch_number: "",
    mrp: "",
    expiry_date: "",
    quantity_sold: "",
    selling_price: "",
  }
}

// ── Entry Card ───────────────────────────────────────────────────────────────

interface SaleEntryCardProps {
  entry: SaleEntryData
  index: number
  stocks: StockOption[]
  canRemove: boolean
  onUpdate: (key: string, field: keyof SaleEntryData, value: string) => void
  onRemove: (key: string) => void
  onBatchSelect: (key: string, stock: StockOption) => void
  onScanResult: (key: string, result: PackagingScanResult) => void
}

function SaleEntryCard({
  entry,
  index,
  stocks,
  canRemove,
  onUpdate,
  onRemove,
  onBatchSelect,
  onScanResult,
}: SaleEntryCardProps) {
  const [comboOpen, setComboOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  const handleBatchSelect = (batchNumber: string) => {
    setComboOpen(false)
    setSearchQuery("")
    const stock = stocks.find((s) => s.batch_number === batchNumber)
    if (stock) onBatchSelect(entry.key, stock)
  }

  const filteredStocks = stocks.filter((s) => {
    const q = searchQuery.toLowerCase()
    return (
      s.medicine_name.toLowerCase().includes(q) ||
      s.batch_number.toLowerCase().includes(q)
    )
  })

  return (
    <div className="rounded-lg border p-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Item {index + 1}</span>
        <div className="flex items-center gap-1">
          <MedicineScanner onResult={(r) => onScanResult(entry.key, r)} />
          {canRemove && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive"
              onClick={() => onRemove(entry.key)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Mode toggle */}
      <div className="flex rounded-md border overflow-hidden text-xs">
        {(["stock", "manual"] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => onUpdate(entry.key, "mode", m)}
            className={cn(
              "flex-1 px-2 py-1 font-medium transition-colors",
              entry.mode === m
                ? "bg-primary text-primary-foreground"
                : "bg-background text-muted-foreground hover:bg-muted",
            )}
          >
            {m === "stock" ? "From Stock" : "Manual"}
          </button>
        ))}
      </div>

      {entry.mode === "stock" ? (
        <>
          <div className="space-y-1">
            <Label>Batch / Medicine</Label>
            <Popover open={comboOpen} onOpenChange={setComboOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  role="combobox"
                  className="w-full justify-between font-normal text-sm"
                >
                  {entry.batch_number
                    ? `${entry.medicine_name} — ${entry.batch_number}`
                    : "Select a batch…"}
                  <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-[var(--radix-popover-trigger-width)] p-0"
                align="start"
              >
                <div className="p-2 border-b">
                  <Input
                    autoFocus
                    placeholder="Search medicine or batch…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <ul className="max-h-48 overflow-y-auto py-1">
                  {filteredStocks.map((s) => (
                    <li key={s.batch_number}>
                      <button
                        type="button"
                        onClick={() => handleBatchSelect(s.batch_number)}
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent"
                      >
                        <Check
                          className={cn(
                            "h-3 w-3 shrink-0",
                            entry.batch_number === s.batch_number
                              ? "opacity-100"
                              : "opacity-0",
                          )}
                        />
                        <span className="flex-1 text-left">
                          {s.medicine_name}{" "}
                          <span className="text-muted-foreground text-xs">
                            — {s.batch_number} ({s.quantity_available} left)
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                  {filteredStocks.length === 0 && (
                    <li className="px-3 py-2 text-sm text-muted-foreground">
                      No matches found.
                    </li>
                  )}
                </ul>
              </PopoverContent>
            </Popover>
          </div>
          {entry.batch_number && (
            <div className="rounded-md bg-muted px-3 py-2 text-sm space-y-0.5">
              <p>
                <span className="font-medium">Medicine:</span>{" "}
                {entry.medicine_name}
              </p>
              <p>
                <span className="font-medium">MRP:</span> ₹{entry.mrp}
              </p>
              <p>
                <span className="font-medium">Expiry:</span>{" "}
                {entry.expiry_date}
              </p>
            </div>
          )}
        </>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 space-y-1">
            <Label>Medicine Name</Label>
            <Input
              placeholder="e.g. Paracetamol 500mg"
              value={entry.medicine_name}
              onChange={(e) =>
                onUpdate(entry.key, "medicine_name", e.target.value)
              }
            />
          </div>
          <div className="space-y-1">
            <Label>Batch Number</Label>
            <Input
              placeholder="e.g. BT-2025-001"
              value={entry.batch_number}
              onChange={(e) =>
                onUpdate(entry.key, "batch_number", e.target.value)
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
              onChange={(e) => onUpdate(entry.key, "mrp", e.target.value)}
            />
          </div>
          <div className="col-span-2 space-y-1">
            <Label>Expiry Date</Label>
            <Input
              type="date"
              value={entry.expiry_date}
              onChange={(e) =>
                onUpdate(entry.key, "expiry_date", e.target.value)
              }
            />
          </div>
        </div>
      )}

      {/* Common fields */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Quantity</Label>
          <Input
            type="number"
            min="1"
            placeholder="1"
            value={entry.quantity_sold}
            onChange={(e) =>
              onUpdate(entry.key, "quantity_sold", e.target.value)
            }
          />
        </div>
        <div className="space-y-1">
          <Label>Selling Price (₹)</Label>
          <Input
            type="number"
            step="0.01"
            min="0.01"
            placeholder={entry.mrp || "0.00"}
            value={entry.selling_price}
            onChange={(e) =>
              onUpdate(entry.key, "selling_price", e.target.value)
            }
          />
        </div>
      </div>
    </div>
  )
}

// ── Main Dialog ──────────────────────────────────────────────────────────────

export function RecordSaleDialog({ stocks }: RecordSaleDialogProps) {
  const [open, setOpen] = useState(false)
  const [entries, setEntries] = useState<SaleEntryData[]>([createSaleEntry()])
  const [saleDate, setSaleDate] = useState("")
  const [discount, setDiscount] = useState("10")
  const [isPending, startTransition] = useTransition()

  const today = new Date().toISOString().split("T")[0]

  const reset = () => {
    setEntries([createSaleEntry()])
    setSaleDate("")
    setDiscount("10")
  }

  const applyDiscount = (mrp: string, disc: string): string => {
    const mrpNum = parseFloat(mrp)
    if (isNaN(mrpNum) || mrpNum <= 0) return ""
    const discNum = parseFloat(disc)
    return (mrpNum * (1 - discNum / 100)).toFixed(2)
  }

  const updateEntry = (
    key: string,
    field: keyof SaleEntryData,
    value: string,
  ) => {
    setEntries((prev) =>
      prev.map((e) => {
        if (e.key !== key) return e
        const updated = { ...e, [field]: value }
        // Clear fields when switching mode
        if (field === "mode") {
          updated.medicine_name = ""
          updated.batch_number = ""
          updated.mrp = ""
          updated.expiry_date = ""
          updated.selling_price = ""
        }
        // Auto-compute selling price when MRP changes
        if (field === "mrp") {
          updated.selling_price = applyDiscount(value, discount)
        }
        return updated
      }),
    )
  }

  const handleDiscountChange = (newDiscount: string) => {
    setDiscount(newDiscount)
    setEntries((prev) =>
      prev.map((e) => ({
        ...e,
        selling_price: applyDiscount(e.mrp, newDiscount),
      })),
    )
  }

  const removeEntry = (key: string) => {
    setEntries((prev) => prev.filter((e) => e.key !== key))
  }

  const addEntry = () => {
    setEntries((prev) => [...prev, createSaleEntry()])
  }

  const handleBatchSelect = (key: string, stock: StockOption) => {
    setEntries((prev) =>
      prev.map((e) => {
        if (e.key !== key) return e
        const mrpStr = String(stock.mrp)
        return {
          ...e,
          medicine_name: stock.medicine_name,
          batch_number: stock.batch_number,
          mrp: mrpStr,
          expiry_date: stock.expiry_date,
          selling_price: applyDiscount(mrpStr, discount),
        }
      }),
    )
  }

  const handleScanResult = (key: string, result: PackagingScanResult) => {
    if (!result.batch_number) {
      toast.error("Batch number not found on packaging.")
      return
    }
    const match = stocks.find(
      (s) =>
        s.batch_number.toLowerCase() === result.batch_number!.toLowerCase(),
    )
    if (match) {
      setEntries((prev) =>
        prev.map((e) => {
          if (e.key !== key) return e
          const mrpStr = String(match.mrp)
          return {
            ...e,
            mode: "stock" as Mode,
            medicine_name: match.medicine_name,
            batch_number: match.batch_number,
            mrp: mrpStr,
            expiry_date: match.expiry_date,
            selling_price: applyDiscount(mrpStr, discount),
          }
        }),
      )
    } else {
      setEntries((prev) =>
        prev.map((e) => {
          if (e.key !== key) return e
          return {
            ...e,
            mode: "manual" as Mode,
            batch_number: result.batch_number!,
            medicine_name: "",
            mrp: "",
            expiry_date: "",
          }
        }),
      )
      toast.info("Batch not in stock — switched to manual entry.")
    }
  }

  const handleSubmit = () => {
    startTransition(async () => {
      const date = saleDate || today
      const results = await Promise.all(
        entries.map(async (entry) => {
          const fd = new FormData()
          fd.set("medicine_name", entry.medicine_name)
          fd.set("batch_number", entry.batch_number)
          fd.set("mrp", entry.mrp)
          fd.set("expiry_date", entry.expiry_date)
          fd.set("quantity_sold", entry.quantity_sold)
          fd.set("selling_price", entry.selling_price)
          fd.set("sale_date", date)
          fd.set(
            "manual_entry",
            entry.mode === "manual" ? "true" : "false",
          )
          return recordSale({ success: false, message: "" }, fd)
        }),
      )

      const successes = results.filter((r) => r.success).length
      const failures = results.filter((r) => !r.success).length

      if (successes > 0) {
        toast.success(
          `${successes} sale${successes > 1 ? "s" : ""} recorded.`,
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
          Record Sale
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Record Sale</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 overflow-y-auto flex-1 pr-1">
          {/* Shared field */}
          <div className="space-y-1">
            <Label>Sale Date</Label>
            <Input
              type="date"
              value={saleDate || today}
              onChange={(e) => setSaleDate(e.target.value)}
            />
          </div>

          {/* Discount dropdown */}
          <div className="space-y-1">
            <Label>Discount %</Label>
            <Select value={discount} onValueChange={handleDiscountChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select discount" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10%</SelectItem>
                <SelectItem value="15">15%</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Entry cards */}
          {entries.map((entry, i) => (
            <SaleEntryCard
              key={entry.key}
              entry={entry}
              index={i}
              stocks={stocks}
              canRemove={entries.length > 1}
              onUpdate={updateEntry}
              onRemove={removeEntry}
              onBatchSelect={handleBatchSelect}
              onScanResult={handleScanResult}
            />
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
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              const date = saleDate || today
              const validEntries = entries.filter(
                (e) => e.medicine_name && e.batch_number && e.mrp && e.quantity_sold,
              )
              if (validEntries.length === 0) {
                toast.error("Fill in at least one complete item to generate a bill.")
                return
              }
              generateBillPDF({
                date,
                items: validEntries.map((e) => ({
                  medicine_name: e.medicine_name,
                  batch_number: e.batch_number,
                  expiry_date: e.expiry_date,
                  quantity: parseInt(e.quantity_sold) || 0,
                  rate: parseFloat(e.selling_price) || parseFloat(applyDiscount(e.mrp, discount)) || 0,
                })),
              })
              toast.success("Bill downloaded.")
            }}
          >
            <Download className="h-4 w-4 mr-1" />
            Download Bill
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending
              ? "Saving…"
              : `Record ${entries.length} Sale${entries.length > 1 ? "s" : ""}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

