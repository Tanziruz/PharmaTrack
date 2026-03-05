"use client"

import { useRef, useState, useTransition } from "react"
import { toast } from "sonner"
import { scanBill, type ExtractedItem } from "@/lib/actions/scan-bill"
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
import { Camera, CheckCircle2, Loader2, ScanLine, Trash2, Upload, X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Party } from "@/lib/types/database"

// ─── Types ───────────────────────────────────────────────────────────────────

type Step = "upload" | "scanning" | "review"

interface DraftItem {
  key:             string
  medicine_name:   string
  batch_number:    string
  mrp:             string
  expiry_date:     string
  quantity_bought: string
  purchase_date:   string
  supplier_name:   string
  status:          "pending" | "saving" | "saved" | "error"
  error:           string
}

function toDraft(item: ExtractedItem, idx: number): DraftItem {
  return {
    key:             `item-${idx}-${Date.now()}`,
    medicine_name:   item.medicine_name   ?? "",
    batch_number:    item.batch_number    ?? "",
    mrp:             item.mrp             != null ? String(item.mrp)             : "",
    expiry_date:     item.expiry_date     ?? "",
    quantity_bought: item.quantity_bought != null ? String(item.quantity_bought) : "",
    purchase_date:   item.purchase_date   ?? new Date().toISOString().split("T")[0],
    supplier_name:   item.supplier_name   ?? "",
    status:          "pending",
    error:           "",
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

interface ImportBillDialogProps {
  parties: Party[]
}

const INITIAL_STATE: PurchaseActionState = { success: false, message: "" }

export function ImportBillDialog({ parties: _parties }: ImportBillDialogProps) {
  const [open, setOpen]           = useState(false)
  const [step, setStep]           = useState<Step>("upload")
  const [preview, setPreview]     = useState<string | null>(null)
  const [imgData, setImgData]     = useState<{ base64: string; mimeType: string } | null>(null)
  const [items, setItems]         = useState<DraftItem[]>([])
  const [isSaving, startSaving]   = useTransition()

  const fileRef   = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)

  // ── helpers ──────────────────────────────────────────────────────────────

  const reset = () => {
    setStep("upload")
    setPreview(null)
    setImgData(null)
    setItems([])
  }

  const handleOpenChange = (v: boolean) => {
    setOpen(v)
    if (!v) reset()
  }

  const processFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      setPreview(dataUrl)

      // Resize to max 1400px via canvas before sending to Gemini
      const img = new Image()
      img.onload = () => {
        const MAX = 1400
        let { width, height } = img
        if (width > MAX || height > MAX) {
          const ratio = Math.min(MAX / width, MAX / height)
          width  = Math.round(width  * ratio)
          height = Math.round(height * ratio)
        }
        const canvas = document.createElement("canvas")
        canvas.width  = width
        canvas.height = height
        canvas.getContext("2d")!.drawImage(img, 0, 0, width, height)
        const base64 = canvas.toDataURL("image/jpeg", 0.85).split(",")[1]
        setImgData({ base64, mimeType: "image/jpeg" })
      }
      img.src = dataUrl
    }
    reader.readAsDataURL(file)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
    // reset input so same file can be picked again
    e.target.value = ""
  }

  // ── scan ─────────────────────────────────────────────────────────────────

  const handleScan = async () => {
    if (!imgData) return
    setStep("scanning")
    const result = await scanBill(imgData.base64, imgData.mimeType)
    if (!result.success) {
      toast.error(result.message)
      setStep("upload")
      return
    }
    setItems(result.items.map(toDraft))
    setStep("review")
  }

  // ── edit / remove items ──────────────────────────────────────────────────

  const updateItem = (key: string, field: keyof DraftItem, value: string) =>
    setItems((prev) =>
      prev.map((item) => (item.key === key ? { ...item, [field]: value } : item)),
    )

  const removeItem = (key: string) =>
    setItems((prev) => prev.filter((item) => item.key !== key))

  // ── save all ─────────────────────────────────────────────────────────────

  const pendingItems = items.filter((i) => i.status === "pending")

  const handleSaveAll = () => {
    if (pendingItems.length === 0) return
    startSaving(async () => {
      const results = await Promise.all(
        pendingItems.map(async (item) => {
          const fd = new FormData()
          fd.set("medicine_name",   item.medicine_name)
          fd.set("batch_number",    item.batch_number)
          fd.set("mrp",             item.mrp)
          fd.set("expiry_date",     item.expiry_date)
          fd.set("quantity_bought", item.quantity_bought)
          fd.set("purchase_date",   item.purchase_date)
          fd.set("supplier_name",   item.supplier_name)
          const result = await addPurchase(INITIAL_STATE, fd)
          return { key: item.key, result }
        }),
      )

      const successes = results.filter((r) => r.result.success)
      const failures  = results.filter((r) => !r.result.success)

      setItems((prev) =>
        prev.map((item) => {
          const r = results.find((x) => x.key === item.key)
          if (!r) return item
          return {
            ...item,
            status: r.result.success ? "saved" : "error",
            error:  r.result.success ? ""      : r.result.message,
          }
        }),
      )

      if (successes.length > 0) {
        toast.success(
          `${successes.length} purchase${successes.length > 1 ? "s" : ""} recorded successfully.`,
        )
      }
      if (failures.length > 0) {
        toast.error(
          `${failures.length} item${failures.length > 1 ? "s" : ""} failed. Review errors and retry.`,
        )
      }
      if (failures.length === 0) {
        setTimeout(() => setOpen(false), 700)
      }
    })
  }

  // ── render ────────────────────────────────────────────────────────────────

  const today = new Date().toISOString().split("T")[0]

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <ScanLine className="h-4 w-4 mr-1" />
          Import from Bill
        </Button>
      </DialogTrigger>

      <DialogContent
        className={cn(
          "sm:max-w-lg",
          step === "review" && items.length > 1 && "sm:max-w-2xl",
        )}
      >
        <DialogHeader>
          <DialogTitle>Import Purchases from Bill</DialogTitle>
        </DialogHeader>

        {/* ── Step 1: Upload ───────────────────────────────────────────── */}
        {step === "upload" && (
          <div className="space-y-4">
            {/* hidden file inputs */}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileChange}
            />

            {preview ? (
              <div className="relative rounded-lg border overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={preview}
                  alt="Bill preview"
                  className="w-full max-h-72 object-contain bg-muted/30"
                />
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute top-2 right-2 h-7 w-7 shadow-sm"
                  onClick={() => { setPreview(null); setImgData(null) }}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full border-2 border-dashed rounded-lg p-10 text-center space-y-3 hover:bg-muted/40 transition-colors"
              >
                <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Drop a bill image here</p>
                  <p className="text-xs text-muted-foreground">or click to browse</p>
                </div>
              </button>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="h-4 w-4 mr-1" />
                {preview ? "Change Image" : "Upload Image"}
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => cameraRef.current?.click()}
              >
                <Camera className="h-4 w-4 mr-1" />
                Take Photo
              </Button>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleScan} disabled={!imgData}>
                <ScanLine className="h-4 w-4 mr-1" />
                Scan Bill
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 2: Scanning ─────────────────────────────────────────── */}
        {step === "scanning" && (
          <div className="flex flex-col items-center justify-center py-14 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Analysing bill with AI…</p>
          </div>
        )}

        {/* ── Step 3: Review ───────────────────────────────────────────── */}
        {step === "review" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {items.length} item{items.length !== 1 ? "s" : ""} detected — review and save.
            </p>

            <div className="space-y-4 max-h-[58vh] overflow-y-auto pr-1">
              {items.map((item, idx) => (
                <div
                  key={item.key}
                  className={cn(
                    "rounded-lg border p-4 space-y-3",
                    item.status === "saved" && "border-green-300 bg-green-50/60",
                    item.status === "error"  && "border-red-300 bg-red-50/60",
                  )}
                >
                  {/* item header */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Item {idx + 1}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {item.status === "saved" && (
                        <span className="flex items-center gap-1 text-xs text-green-700 font-medium">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Saved
                        </span>
                      )}
                      {item.status === "error" && (
                        <span className="text-xs text-destructive">{item.error}</span>
                      )}
                      {item.status === "pending" && items.length > 1 && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => removeItem(item.key)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* fields */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">Medicine Name *</Label>
                      <Input
                        value={item.medicine_name}
                        onChange={(e) => updateItem(item.key, "medicine_name", e.target.value)}
                        placeholder="e.g. Paracetamol 500mg"
                        className="h-8 text-sm"
                        disabled={item.status !== "pending"}
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Batch Number *</Label>
                      <Input
                        value={item.batch_number}
                        onChange={(e) => updateItem(item.key, "batch_number", e.target.value)}
                        placeholder="e.g. BT-001"
                        className="h-8 text-sm"
                        disabled={item.status !== "pending"}
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Supplier</Label>
                      <Input
                        value={item.supplier_name}
                        onChange={(e) => updateItem(item.key, "supplier_name", e.target.value)}
                        placeholder="Supplier name"
                        className="h-8 text-sm"
                        disabled={item.status !== "pending"}
                        list={`supplier-list-${item.key}`}
                      />
                      <datalist id={`supplier-list-${item.key}`}>
                        {_parties.map((p) => (
                          <option key={p.id} value={p.name} />
                        ))}
                      </datalist>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">MRP (₹) *</Label>
                      <Input
                        value={item.mrp}
                        onChange={(e) => updateItem(item.key, "mrp", e.target.value)}
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder="10.00"
                        className="h-8 text-sm"
                        disabled={item.status !== "pending"}
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Quantity *</Label>
                      <Input
                        value={item.quantity_bought}
                        onChange={(e) => updateItem(item.key, "quantity_bought", e.target.value)}
                        type="number"
                        min="1"
                        placeholder="100"
                        className="h-8 text-sm"
                        disabled={item.status !== "pending"}
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Expiry Date *</Label>
                      <Input
                        value={item.expiry_date}
                        onChange={(e) => updateItem(item.key, "expiry_date", e.target.value)}
                        type="date"
                        className="h-8 text-sm"
                        disabled={item.status !== "pending"}
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Purchase Date *</Label>
                      <Input
                        value={item.purchase_date || today}
                        onChange={(e) => updateItem(item.key, "purchase_date", e.target.value)}
                        type="date"
                        className="h-8 text-sm"
                        disabled={item.status !== "pending"}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between gap-2 pt-1">
              <Button variant="outline" onClick={reset}>
                ← Back
              </Button>
              <Button
                onClick={handleSaveAll}
                disabled={isSaving || pendingItems.length === 0}
              >
                {isSaving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                {pendingItems.length > 1
                  ? `Save All ${pendingItems.length} Items`
                  : "Save Purchase"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
