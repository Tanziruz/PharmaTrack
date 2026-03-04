"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { deleteSale } from "@/lib/actions/sales"
import { EditSaleDialog } from "@/components/sales/edit-sale-dialog"
import type { Sale } from "@/lib/types/database"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Trash2, Search } from "lucide-react"
import { format } from "date-fns"

interface SalesTableProps {
  sales: Sale[]
}

export function SalesTable({ sales }: SalesTableProps) {
  const [isPending, startTransition] = useTransition()
  const [query, setQuery] = useState("")

  const q = query.toLowerCase()
  const filtered = sales.filter(
    (s) =>
      s.medicine_name.toLowerCase().includes(q) ||
      s.batch_number.toLowerCase().includes(q) ||
      s.sale_date.includes(q),
  )

  const handleDelete = (id: string) => {
    if (!confirm("Delete this sale? Stock will be recalculated.")) return
    startTransition(async () => {
      const result = await deleteSale(id)
      if (result.success) toast.success(result.message)
      else toast.error(result.message)
    })
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by medicine, batch, or date…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-8"
        />
      </div>
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Medicine</TableHead>
            <TableHead>Batch No.</TableHead>
            <TableHead className="text-right">MRP (₹)</TableHead>
            <TableHead className="text-right">Selling Price (₹)</TableHead>
            <TableHead className="text-right">Qty Sold</TableHead>
            <TableHead className="text-right">Total (₹)</TableHead>
            <TableHead>Sale Date</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length > 0 ? (
            filtered.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.medicine_name}</TableCell>
                <TableCell>
                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                    {s.batch_number}
                  </code>
                </TableCell>
                <TableCell className="text-right">₹{Number(s.mrp).toFixed(2)}</TableCell>
                <TableCell className="text-right">₹{Number(s.selling_price).toFixed(2)}</TableCell>
                <TableCell className="text-right">{s.quantity_sold}</TableCell>
                <TableCell className="text-right font-medium">
                  ₹{(Number(s.selling_price) * s.quantity_sold).toFixed(2)}
                </TableCell>
                <TableCell>{format(new Date(s.sale_date), "dd MMM yyyy")}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <EditSaleDialog sale={s} />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => handleDelete(s.id)}
                      disabled={isPending}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                {query ? "No sales match your search." : "No sales recorded yet. Click \"Record Sale\" to get started."}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
    </div>  )
}