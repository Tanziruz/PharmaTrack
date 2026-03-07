import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

export interface BillItem {
  medicine_name: string
  batch_number: string
  expiry_date: string
  quantity: number
  rate: number // selling price per unit
}

export interface BillData {
  items: BillItem[]
  date: string // ISO date string e.g. "2026-03-07"
}

export function generateBillPDF(data: BillData) {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()

  // ── Company Header (left) ──────────────────────────────────────────────────
  doc.setFontSize(18)
  doc.setFont("helvetica", "bold")
  doc.text("Medicine Mart", 14, 20)

  doc.setFontSize(9)
  doc.setFont("helvetica", "normal")
  doc.text("Registration No: WB/800/1557-S, WB/800/1558-SB", 14, 27)
  doc.text("GSTIN: 19AASFM3511C1ZD", 14, 32)

  // ── Date (top-right) ──────────────────────────────────────────────────────
  const dateObj = data.date ? new Date(data.date) : new Date()
  const formattedDate = dateObj.toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })
  doc.setFontSize(10)
  doc.text(formattedDate, pageWidth - 14, 20, { align: "right" })

  // ── Divider ────────────────────────────────────────────────────────────────
  doc.setDrawColor(200)
  doc.line(14, 37, pageWidth - 14, 37)

  // ── Table ──────────────────────────────────────────────────────────────────
  const formatExpiry = (dateStr: string) => {
    if (!dateStr) return ""
    const d = new Date(dateStr + (dateStr.length <= 7 ? "-01" : ""))
    return d.toLocaleDateString("en-IN", { month: "short", year: "numeric" })
  }

  const tableBody = data.items.map((item, i) => {
    const total = item.rate * item.quantity
    return [
      String(i + 1),
      item.medicine_name,
      item.batch_number,
      formatExpiry(item.expiry_date),
      String(item.quantity),
      `Rs. ${item.rate.toFixed(2)}`,
      `Rs. ${total.toFixed(2)}`,
    ]
  })

  const grandTotal = data.items.reduce(
    (sum, item) => sum + item.rate * item.quantity,
    0,
  )

  autoTable(doc, {
    startY: 42,
    head: [["#", "Product Name", "Batch No.", "Expiry", "Qty", "Rate", "Amount"]],
    body: tableBody,
    foot: [["", "", "", "", "", "Grand Total", `Rs. ${grandTotal.toFixed(2)}`]],
    theme: "grid",
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: 255,
      fontStyle: "bold",
      fontSize: 9,
      halign: "center",
    },
    bodyStyles: { fontSize: 9, halign: "center" },
    footStyles: {
      fillColor: [245, 245, 245],
      textColor: [0, 0, 0],
      fontStyle: "bold",
      fontSize: 10,
    },
    columnStyles: {
      0: { halign: "center", cellWidth: 10 },
      1: { halign: "left" },
      4: { halign: "center" },
      5: { halign: "right" },
      6: { halign: "right" },
    },
    margin: { left: 14, right: 14 },
  })

  // ── Save ───────────────────────────────────────────────────────────────────
  const fileName = `bill_${dateObj.toISOString().split("T")[0]}.pdf`
  doc.save(fileName)
}
