"use client"

import { useState } from "react"
import { format, differenceInMinutes } from "date-fns"
import type { Sale } from "@/lib/types/database"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { generateBillPDF } from "@/lib/utils/generate-bill-pdf"
import { History, Download, ChevronDown, ChevronRight } from "lucide-react"

/** Sales recorded within this many minutes of each other belong to the same session. */
const SESSION_GAP_MINUTES = 30

interface SaleGroup {
  key: string
  groupNumber: number
  date: Date
  sales: Sale[]
  total: number
}

function groupSalesBySession(sales: Sale[]): SaleGroup[] {
  if (sales.length === 0) return []

  // Sort ascending by created_at to detect consecutive sessions
  const sorted = [...sales].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  )

  const rawGroups: Sale[][] = []
  let currentGroup: Sale[] = [sorted[0]]

  for (let i = 1; i < sorted.length; i++) {
    const gap = differenceInMinutes(
      new Date(sorted[i].created_at),
      new Date(sorted[i - 1].created_at),
    )
    if (gap <= SESSION_GAP_MINUTES) {
      currentGroup.push(sorted[i])
    } else {
      rawGroups.push(currentGroup)
      currentGroup = [sorted[i]]
    }
  }
  rawGroups.push(currentGroup)

  // Reverse so most recent session = Sale 1
  rawGroups.reverse()

  return rawGroups.map((groupSales, i) => ({
    key: groupSales[0].id,
    groupNumber: i + 1,
    date: new Date(groupSales[0].created_at),
    sales: groupSales,
    total: groupSales.reduce(
      (sum, s) => sum + Number(s.selling_price) * s.quantity_sold,
      0,
    ),
  }))
}

interface SalesHistoryDialogProps {
  sales: Sale[]
}

export function SalesHistoryDialog({ sales }: SalesHistoryDialogProps) {
  const [open, setOpen] = useState(false)
  const [discount, setDiscount] = useState("0")
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  const groups = groupSalesBySession(sales)

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const handleGenerateBill = (group: SaleGroup) => {
    const disc = parseFloat(discount)
    generateBillPDF({
      date: format(group.date, "yyyy-MM-dd"),
      items: group.sales.map((s) => ({
        medicine_name: s.medicine_name,
        batch_number: s.batch_number,
        expiry_date: s.expiry_date,
        quantity: s.quantity_sold,
        mrp: Number(s.mrp),
        rate: Number((Number(s.mrp) * (1 - disc / 100)).toFixed(2)),
      })),
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <History className="h-4 w-4 mr-1.5" />
          Sales History
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col gap-4">
        <DialogHeader>
          <DialogTitle>Sales History</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm text-muted-foreground">Bill Discount:</span>
          <Select value={discount} onValueChange={setDiscount}>
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">0%</SelectItem>
              <SelectItem value="10">10%</SelectItem>
              <SelectItem value="15">15%</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-y-auto flex-1 space-y-3 pr-1">
          {groups.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">
              No sales recorded yet.
            </p>
          ) : (
            groups.map((group) => (
              <div key={group.key} className="border rounded-lg overflow-hidden">
                {/* Group header */}
                <button
                  type="button"
                  className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/50 transition-colors"
                  onClick={() => toggleGroup(group.key)}
                >
                  <div className="flex items-center gap-3">
                    {expandedGroups.has(group.key) ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                    <div>
                      <span className="font-semibold">Sale {group.groupNumber}</span>
                      <span className="text-sm text-muted-foreground ml-3">
                        {format(group.date, "dd MMM yyyy, hh:mm a")}
                      </span>
                    </div>
                    <Badge variant="secondary" className="shrink-0">
                      {group.sales.length} item{group.sales.length !== 1 ? "s" : ""}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-semibold">₹{group.total.toFixed(2)}</span>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleGenerateBill(group)
                      }}
                    >
                      <Download className="h-3.5 w-3.5 mr-1" />
                      Bill
                    </Button>
                  </div>
                </button>

                {/* Expanded detail table */}
                {expandedGroups.has(group.key) && (
                  <div className="border-t">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Medicine</TableHead>
                          <TableHead>Batch No.</TableHead>
                          <TableHead className="text-right">MRP (₹)</TableHead>
                          <TableHead className="text-right">Selling Price (₹)</TableHead>
                          <TableHead className="text-right">Qty</TableHead>
                          <TableHead className="text-right">Total (₹)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {group.sales.map((s) => (
                          <TableRow key={s.id}>
                            <TableCell className="font-medium">
                              {s.medicine_name}
                            </TableCell>
                            <TableCell>
                              <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                                {s.batch_number}
                              </code>
                            </TableCell>
                            <TableCell className="text-right">
                              ₹{Number(s.mrp).toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right">
                              ₹{Number(s.selling_price).toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right">
                              {s.quantity_sold}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              ₹{(Number(s.selling_price) * s.quantity_sold).toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
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
