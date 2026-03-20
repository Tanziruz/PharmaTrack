"use client"

import { useMemo, useState } from "react"
import { format } from "date-fns"
import { History, Download } from "lucide-react"
import type { Sale } from "@/lib/types/database"
import { generateBillPDF } from "@/lib/utils/generate-bill-pdf"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface SalesHistoryDialogProps {
  sales: Sale[]
}

interface SaleGroup {
  groupId: string
  createdAt: string
  saleDate: string
  items: Sale[]
  totalAmount: number
}

export function SalesHistoryDialog({ sales }: SalesHistoryDialogProps) {
  const [open, setOpen] = useState(false)

  const groupedSales = useMemo<SaleGroup[]>(() => {
    const groups = new Map<string, SaleGroup>()

    for (const sale of sales) {
      const groupId = sale.sale_group_id ?? sale.id
      const existing = groups.get(groupId)
      const lineAmount = Number(sale.selling_price) * sale.quantity_sold

      if (!existing) {
        groups.set(groupId, {
          groupId,
          createdAt: sale.created_at,
          saleDate: sale.sale_date,
          items: [sale],
          totalAmount: lineAmount,
        })
        continue
      }

      existing.items.push(sale)
      existing.totalAmount += lineAmount

      if (new Date(sale.created_at).getTime() > new Date(existing.createdAt).getTime()) {
        existing.createdAt = sale.created_at
      }
    }

    return Array.from(groups.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
  }, [sales])

  const downloadGroupBill = (group: SaleGroup) => {
    generateBillPDF({
      date: group.saleDate,
      items: group.items.map((s) => ({
        medicine_name: s.medicine_name,
        batch_number: s.batch_number,
        expiry_date: s.expiry_date,
        quantity: s.quantity_sold,
        mrp: Number(s.mrp),
        rate: Number(s.selling_price),
      })),
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <History className="h-4 w-4 mr-1" />
          Sales History Amount
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Sales History</DialogTitle>
        </DialogHeader>

        {groupedSales.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No sales have been recorded yet.
          </p>
        ) : (
          <div className="space-y-4">
            {groupedSales.map((group, index) => (
              <div key={group.groupId} className="rounded-lg border p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">Sale Session {index + 1}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(group.createdAt), "dd MMM yyyy, hh:mm a")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {group.items.length} item{group.items.length > 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Total Amount</p>
                    <p className="text-base font-semibold">Rs. {group.totalAmount.toFixed(2)}</p>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="mt-2"
                      onClick={() => downloadGroupBill(group)}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Download Bill
                    </Button>
                  </div>
                </div>

                <div className="rounded-md border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/60">
                      <tr>
                        <th className="text-left font-medium px-3 py-2">Medicine</th>
                        <th className="text-left font-medium px-3 py-2">Batch</th>
                        <th className="text-right font-medium px-3 py-2">Qty</th>
                        <th className="text-right font-medium px-3 py-2">MRP</th>
                        <th className="text-right font-medium px-3 py-2">Rate</th>
                        <th className="text-right font-medium px-3 py-2">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.items.map((item) => (
                        <tr key={item.id} className="border-t">
                          <td className="px-3 py-2">{item.medicine_name}</td>
                          <td className="px-3 py-2">{item.batch_number}</td>
                          <td className="px-3 py-2 text-right">{item.quantity_sold}</td>
                          <td className="px-3 py-2 text-right">Rs. {Number(item.mrp).toFixed(2)}</td>
                          <td className="px-3 py-2 text-right">Rs. {Number(item.selling_price).toFixed(2)}</td>
                          <td className="px-3 py-2 text-right font-medium">
                            Rs. {(Number(item.selling_price) * item.quantity_sold).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
