/**
 * Client-side OCR extraction for Indian medicine packaging.
 * Uses Tesseract.js (browser WebAssembly) + curated regex patterns.
 * No LLM involved — pure OCR + regex.
 */

export interface PackagingScanResult {
  batch_number?: string
  expiry_date?: string // YYYY-MM-DD
  mrp?: string // decimal string e.g. "149.00"
}

const MONTHS: Record<string, string> = {
  jan: "01", feb: "02", mar: "03", apr: "04",
  may: "05", jun: "06", jul: "07", aug: "08",
  sep: "09", oct: "10", nov: "11", dec: "12",
}

function padYear(y: string): string {
  return y.length === 2 ? `20${y}` : y
}

function padMonth(m: string): string {
  return m.length === 1 ? `0${m}` : m
}

// ── Image preprocessing ──────────────────────────────────────────────────────

function preprocessImage(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const MAX = 1600
      let { width, height } = img
      if (width > MAX || height > MAX) {
        const ratio = Math.min(MAX / width, MAX / height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }

      const canvas = document.createElement("canvas")
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext("2d")!
      ctx.drawImage(img, 0, 0, width, height)

      // Convert to grayscale + contrast boost
      const imageData = ctx.getImageData(0, 0, width, height)
      const d = imageData.data
      for (let i = 0; i < d.length; i += 4) {
        let gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
        gray = Math.min(255, Math.max(0, (gray - 128) * 1.5 + 128))
        d[i] = d[i + 1] = d[i + 2] = gray
      }
      ctx.putImageData(imageData, 0, 0)

      resolve(canvas.toDataURL("image/png"))
    }
    img.src = dataUrl
  })
}

// ── Regex extraction ─────────────────────────────────────────────────────────

function extractBatch(text: string): string | undefined {
  // B.No. / B. No. / Batch No. / B.NO. patterns
  const main =
    /(?:b\.?\s*n[o0]\.?|batch\s*n[o0]\.?)\s*[:\-.]?\s*([A-Z0-9][A-Z0-9\s\/\-\.]{1,19})/i
  const m = text.match(main)
  if (m) {
    return m[1].trim().replace(/\s+/g, "")
  }

  // Lot fallback — ultra-compact "L:NT5D"
  const lot = /\bL\s*:\s*([A-Z0-9][A-Z0-9\-]{2,12})/i
  const lm = text.match(lot)
  if (lm) return lm[1].trim()

  return undefined
}

function extractExpiry(text: string): string | undefined {
  // Pattern 1: Label followed by numeric MM/YYYY or MM/YY or M/YYYY
  // Handles: EXP.10/2026, EXP. 07/27, Expiry Date: 2/2027, Exp. Dt.: 06/2027
  const numericExp =
    /(?:exp(?:iry)?\.?\s*(?:d[t.]?\.?|date)?\s*[:\-.]?\s*|e\s*:\s*)(\d{1,2})\s*[\/\-]\s*(\d{2,4})/gi
  let nm
  while ((nm = numericExp.exec(text)) !== null) {
    const month = padMonth(nm[1])
    const year = padYear(nm[2])
    const mi = parseInt(month, 10)
    if (mi >= 1 && mi <= 12) {
      return `${year}-${month}-01`
    }
  }

  // Pattern 2: Label followed by month name: SEP.2027, AUG 2027, MAR. 2027, NOV26
  // Handles: EXP.MAY 2027, Exp. Dt.: AUG.2027, Expiry Date: MAR. 2027, E:NOV26
  const monthNameExp =
    /(?:exp(?:iry)?\.?\s*(?:d[t.]?\.?|date)?\s*[:\-.]?\s*|e\s*:\s*)(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\.?\s*[,\-\/]?\s*(\d{2,4})/gi
  let mm
  while ((mm = monthNameExp.exec(text)) !== null) {
    const month = MONTHS[mm[1].toLowerCase()]
    const year = padYear(mm[2])
    if (month) return `${year}-${month}-01`
  }

  return undefined
}

function extractMrp(text: string): string | undefined {
  // Pattern 1: M.R.P. / MRP followed (with possible stuff between) by Rs. or ₹ then number
  // Handles: M.R.P. Rs. 149.00, MRP Rs.95.55, M.R.P. ₹ 231.56, MRP FOR 20 TABS. Rs. 55.71
  // Also handles: M.R.P.₹238.10 (no space)
  const mrpLabel =
    /m\.?\s*r\.?\s*p\.?[^₹\d\n]{0,40}?(?:rs\.?|₹)\s*[:\-]?\s*(\d{1,6}(?:[.\·]\d{1,2})?)/gi
  let m
  while ((m = mrpLabel.exec(text)) !== null) {
    const val = m[1].replace("·", ".")
    if (parseFloat(val) > 0) return val
  }

  // Pattern 2: Just Rs. followed by number (no MRP prefix), e.g. "Rs. 176.25"
  const rsOnly = /\brs\.?\s*(\d{1,6}(?:[.\·]\d{1,2})?)/gi
  while ((m = rsOnly.exec(text)) !== null) {
    const val = m[1].replace("·", ".")
    if (parseFloat(val) > 0) return val
  }

  // Pattern 3: ₹ symbol only fallback — "₹ 115.58" (minimum 2 digits to avoid noise)
  const rupeeOnly = /₹\s*(\d{2,6}(?:[.\·]\d{1,2})?)/g
  while ((m = rupeeOnly.exec(text)) !== null) {
    const val = m[1].replace("·", ".")
    if (parseFloat(val) > 0) return val
  }

  return undefined
}

function parsePackagingText(text: string): PackagingScanResult {
  const result: PackagingScanResult = {}
  result.batch_number = extractBatch(text)
  result.expiry_date = extractExpiry(text)
  result.mrp = extractMrp(text)
  return result
}

// ── Main public function ─────────────────────────────────────────────────────

export async function scanMedicinePackaging(
  dataUrl: string,
): Promise<PackagingScanResult> {
  const processed = await preprocessImage(dataUrl)

  const { createWorker, PSM } = await import("tesseract.js")
  const worker = await createWorker("eng")
  await worker.setParameters({
    tessedit_pageseg_mode: PSM.SPARSE_TEXT,
  })

  const {
    data: { text },
  } = await worker.recognize(processed)
  await worker.terminate()

  return parsePackagingText(text)
}

/**
 * Count how many fields were extracted.
 */
export function countExtracted(result: PackagingScanResult): number {
  let count = 0
  if (result.batch_number) count++
  if (result.expiry_date) count++
  if (result.mrp) count++
  return count
}
