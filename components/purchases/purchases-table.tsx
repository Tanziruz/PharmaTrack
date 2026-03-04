"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { deletePurchase } from "@/lib/actions/purchases"
import { EditPurchaseDialog } from "@/components/purchases/edit-purchase-dialog"
import type { Purchase, Party } from "@/lib/types/database"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Trash2, Search } from "lucide-react"
import { format } from "date-fns"

interface PurchasesTableProps {
  purchases: Purchase[]
  parties: Party[]
}

export function PurchasesTable({ purchases, parties }: PurchasesTableProps) {
  const [isPending, startTransition] = useTransition()
  const [query, setQuery] = useState("")

  const q = query.toLowerCase()
  const filtered = purchases.filter(
    (p) =>
      p.medicine_name.toLowerCase().includes(q) ||
      p.batch_number.toLowerCase().includes(q) ||
      p.purchase_date.includes(q),
  )

  const handleDelete = (id: string) => {
    if (!confirm("Delete this purchase? Stock will be recalculated.")) return
    startTransition(async () => {
      const result = await deletePurchase(id)
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
            <TableHead>Supplier</TableHead>
            <TableHead className="text-right">MRP (₹)</TableHead>
            <TableHead className="text-right">Qty Bought</TableHead>
            <TableHead>Expiry Date</TableHead>
            <TableHead>Purchase Date</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length > 0 ? (
            filtered.map((p) => {
              const expiry = new Date(p.expiry_date)
              const isExpired = expiry < new Date()
              const isExpiringSoon =
                !isExpired &&
                expiry <= new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)

              return (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.medicine_name}</TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                      {p.batch_number}
                    </code>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {p.supplier_name ?? <span className="text-xs opacity-50">—</span>}
                  </TableCell>
                  <TableCell className="text-right">₹{Number(p.mrp).toFixed(2)}</TableCell>
                  <TableCell className="text-right">{p.quantity_bought}</TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1.5">
                      {format(expiry, "dd MMM yyyy")}
                      {isExpired && (
                        <Badge variant="destructive" className="text-[10px] px-1 py-0">
                          Expired
                        </Badge>
                      )}
                      {isExpiringSoon && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0 border-orange-400 text-orange-600">
                          Soon
                        </Badge>
                      )}
                    </span>
                  </TableCell>
                  <TableCell>{format(new Date(p.purchase_date), "dd MMM yyyy")}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <EditPurchaseDialog purchase={p} parties={parties} />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => handleDelete(p.id)}
                        disabled={isPending}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })
          ) : (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                {query ? "No purchases match your search." : "No purchases recorded yet. Click \"Add Purchase\" to get started."}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
    </div>  )
}