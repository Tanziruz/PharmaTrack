"use server"

export interface ExtractedItem {
  medicine_name:   string | null
  batch_number:    string | null
  mrp:             number | null
  expiry_date:     string | null  // YYYY-MM-DD
  quantity_bought: number | null
  purchase_date:   string | null  // YYYY-MM-DD
  supplier_name:   string | null
}

export type ScanBillResult =
  | { success: true;  items: ExtractedItem[] }
  | { success: false; message: string }

export async function scanBill(
  base64: string,
  mimeType: string,
): Promise<ScanBillResult> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return { success: false, message: "Gemini API key not configured." }

  const today = new Date().toISOString().split("T")[0]

  const prompt = `You are analysing a pharmacy purchase invoice / bill / challan image.
Extract ALL medicine line items visible in the bill and return them as a JSON array.

For each medicine item, extract:
- medicine_name: Full product name including strength/dosage (string, null if unclear)
- batch_number: Batch / Lot number printed on the bill (string, "" if not visible)
- mrp: Maximum Retail Price as a plain number, no currency symbol (number, null if not visible)
- expiry_date: Expiry date in YYYY-MM-DD format — if only month/year is shown use "01" for the day (string, null if not visible)
- quantity_bought: Quantity / units purchased as an integer (number, null if not visible)
- purchase_date: Invoice / bill date in YYYY-MM-DD format (string, use "${today}" if not visible)
- supplier_name: Supplier / distributor / company name from the bill header (string, "" if not visible)

Return ONLY a valid JSON array with no markdown, no code fences, no explanation.
Example: [{"medicine_name":"Paracetamol 500mg","batch_number":"BT001","mrp":12.50,"expiry_date":"2027-06-01","quantity_bought":100,"purchase_date":"${today}","supplier_name":"ABC Pharma Pvt Ltd"}]`

  let response: Response
  try {
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { inline_data: { mime_type: mimeType, data: base64 } },
              { text: prompt },
            ],
          }],
          generationConfig: { temperature: 0.1 },
        }),
      },
    )
  } catch (e) {
    return { success: false, message: `Network error: ${(e as Error).message}` }
  }

  if (!response.ok) {
    const text = await response.text().catch(() => response.statusText)
    return { success: false, message: `Gemini API error (${response.status}): ${text.slice(0, 200)}` }
  }

  const json = await response.json()
  const raw: string = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? ""

  // Strip any accidental markdown code fences
  const cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim()

  let items: ExtractedItem[]
  try {
    const parsed = JSON.parse(cleaned)
    items = Array.isArray(parsed) ? parsed : [parsed]
  } catch {
    return { success: false, message: "Could not read the bill. Please try a clearer image or better lighting." }
  }

  if (items.length === 0) {
    return { success: false, message: "No medicine items detected. Try a clearer photo." }
  }

  return { success: true, items }
}
