"use client"

import { useRef, useState } from "react"
import { toast } from "sonner"
import { Camera, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  scanMedicinePackaging,
  countExtracted,
  type PackagingScanResult,
} from "@/lib/utils/ocr-extract"

interface MedicineScannerProps {
  onResult: (result: PackagingScanResult) => void
  disabled?: boolean
}

export function MedicineScanner({ onResult, disabled }: MedicineScannerProps) {
  const [scanning, setScanning] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    // reset input so same file can be picked again
    e.target.value = ""

    setScanning(true)
    try {
      const dataUrl = await fileToDataUrl(file)
      const result = await scanMedicinePackaging(dataUrl)
      const found = countExtracted(result)

      if (found === 0) {
        toast.error("Could not read packaging. Please fill manually.")
      } else if (found < 3) {
        const missing: string[] = []
        if (!result.batch_number) missing.push("batch")
        if (!result.expiry_date) missing.push("expiry")
        if (!result.mrp) missing.push("MRP")
        toast.info(`Filled ${found} field(s) — ${missing.join(", ")} not found.`)
        onResult(result)
      } else {
        toast.success("All fields auto-filled from scan.")
        onResult(result)
      }
    } catch {
      toast.error("Scan failed. Please try again or fill manually.")
    } finally {
      setScanning(false)
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-8 w-8 shrink-0"
        disabled={disabled || scanning}
        onClick={() => inputRef.current?.click()}
        title="Scan medicine packaging"
      >
        {scanning ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Camera className="h-4 w-4" />
        )}
      </Button>
    </>
  )
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target?.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
