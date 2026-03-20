"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { History, Download, ChevronDown, ChevronRight } from "lucide-react"
import { format } from "date-fns"
import { generateBillPDF } from "@/lib/utils/generate-bill-pdf"
import type { Sale } from "@/lib/types/database"

interface SalesHistoryDialogProps {
  sales: Sale[]
}

interface SaleGroup {
  groupId: string
  date: string
  items: Sale[]
  total: number
}

export function SalesHistoryDialog({ sales }: SalesHistoryDialogProps) {
  const [open, setOpen] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  // Group sales by sale_group_id. Sales without a group_id are each their own group.
  const groups: SaleGroup[] = useMemo(() => {
    const grouped = new Map<string, Sale[]>()
    sales.forEach((sale) => {
      const key = sale.sale_group_id ?? `individual_${sale.id}`
      if (!grouped.has(key)) grouped.set(key, [])
      grouped.get(key)!.push(sale)
    })

    return Array.from(grouped.entries())
      .map(([groupId, items]) => ({
        groupId,
        date: items[0].sale_date,
        items,
        total: items.reduce(
          (sum, s) => sum + Number(s.selling_price) * s.quantity_sold,
          0,
        ),
      }))
      .sort(
        (a, b) =>
          new Date(b.items[0].created_at).getTime() -
          new Date(a.items[0].created_at).getTime(),
      )
  }, [sales])

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(groupId)) next.delete(groupId)
      else next.add(groupId)
      return next
    })
  }

  const handleGenerateBill = (group: SaleGroup, e: React.MouseEvent) => {
    e.stopPropagation()
    generateBillPDF({
      date: group.date,
      items: group.items.map((s) => ({
        medicine_name: s.medicine_name,
        batch_number: s.batch_number,
        expiry_date: s.expiry_date,
        quantity: s.quantity_sold,
        rate: Number(s.selling_price),
        mrp: Number(s.mrp),
      })),
    })
    toast.success("Bill downloaded.")
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <History className="h-4 w-4 mr-1" />
          Sales History
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Sales History</DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto flex-1 space-y-2 pr-1 py-2">
          {groups.length === 0 ? (
            <p className="text-center py-12 text-muted-foreground">
              No sales recorded yet.
            </p>
          ) : (
            groups.map((group, index) => (
              <div key={group.groupId} className="rounded-lg border">
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors rounded-lg"
                  onClick={() => toggleGroup(group.groupId)}
                >
                  <div className="flex items-center gap-3">
                    {expandedGroups.has(group.groupId) ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                    <div className="text-left">
                      <p className="text-sm font-medium">
                        Sale {groups.length - index}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(group.date), "dd MMM yyyy")}
                        {" · "}
                        {group.items.length} item
                        {group.items.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold">
                      ₹{group.total.toFixed(2)}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={(e) => handleGenerateBill(group, e)}
                    >
                      <Download className="h-3.5 w-3.5 mr-1" />
                      Bill
                    </Button>
                  </div>
                </button>

                {expandedGroups.has(group.groupId) && (
                  <div className="border-t px-4 py-3">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-muted-foreground border-b">
                          <th className="text-left pb-2 font-medium">
                            Medicine
                          </th>
                          <th className="text-left pb-2 font-medium">Batch</th>
                          <th className="text-right pb-2 font-medium">Qty</th>
                          <th className="text-right pb-2 font-medium">
                            MRP (₹)
                          </th>
                          <th className="text-right pb-2 font-medium">
                            Rate (₹)
                          </th>
                          <th className="text-right pb-2 font-medium">
                            Amount (₹)
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.items.map((item) => (
                          <tr key={item.id} className="border-b border-muted/50 last:border-0">
                            <td className="py-1.5">{item.medicine_name}</td>
                            <td className="py-1.5 text-muted-foreground">
                              <code className="bg-muted px-1 rounded">
                                {item.batch_number}
                              </code>
                            </td>
                            <td className="py-1.5 text-right">
                              {item.quantity_sold}
                            </td>
                            <td className="py-1.5 text-right">
                              {Number(item.mrp).toFixed(2)}
                            </td>
                            <td className="py-1.5 text-right">
                              {Number(item.selling_price).toFixed(2)}
                            </td>
                            <td className="py-1.5 text-right font-medium">
                              {(
                                Number(item.selling_price) * item.quantity_sold
                              ).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
