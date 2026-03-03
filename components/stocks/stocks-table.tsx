"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { updateReorderLevel } from "@/lib/actions/stocks"
import type { Stock } from "@/lib/types/database"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Check, Pencil, X } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

interface StocksTableProps {
  stocks: Stock[]
}

export function StocksTable({ stocks }: StocksTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")
  const [isPending, startTransition] = useTransition()

  const today = new Date()
  const in60Days = new Date(today)
  in60Days.setDate(today.getDate() + 60)

  const getRowClass = (stock: Stock) => {
    const expiry = new Date(stock.expiry_date)
    if (stock.quantity_available === 0) return "bg-gray-50 text-muted-foreground"
    if (expiry <= in60Days) return "bg-red-50"
    if (stock.quantity_available < stock.reorder_level) return "bg-orange-50"
    return ""
  }

  const getStatusBadge = (stock: Stock) => {
    const expiry = new Date(stock.expiry_date)
    if (expiry < today) return <Badge variant="destructive">Expired</Badge>
    if (expiry <= in60Days)
      return <Badge className="bg-red-100 text-red-700 border-red-300 hover:bg-red-100">Expiring Soon</Badge>
    if (stock.quantity_available === 0)
      return <Badge variant="outline" className="text-muted-foreground">Out of Stock</Badge>
    if (stock.quantity_available < stock.reorder_level)
      return <Badge className="bg-orange-100 text-orange-700 border-orange-300 hover:bg-orange-100">Low Stock</Badge>
    return <Badge className="bg-green-100 text-green-700 border-green-300 hover:bg-green-100">In Stock</Badge>
  }

  const handleSaveReorderLevel = (id: string) => {
    const formData = new FormData()
    formData.set("id", id)
    formData.set("reorder_level", editValue)

    startTransition(async () => {
      const result = await updateReorderLevel({ success: false, message: "" }, formData)
      if (result.success) {
        toast.success(result.message)
      } else {
        toast.error(result.message)
      }
      setEditingId(null)
    })
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Medicine</TableHead>
            <TableHead>Batch No.</TableHead>
            <TableHead className="text-right">MRP (₹)</TableHead>
            <TableHead className="text-right">Qty Available</TableHead>
            <TableHead className="text-right">Reorder Level</TableHead>
            <TableHead>Expiry Date</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {stocks.length > 0 ? (
            stocks.map((stock) => (
              <TableRow key={stock.id} className={cn(getRowClass(stock))}>
                <TableCell className="font-medium">{stock.medicine_name}</TableCell>
                <TableCell>
                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                    {stock.batch_number}
                  </code>
                </TableCell>
                <TableCell className="text-right">₹{Number(stock.mrp).toFixed(2)}</TableCell>
                <TableCell className="text-right font-semibold">
                  {stock.quantity_available}
                </TableCell>
                <TableCell className="text-right">
                  {editingId === stock.id ? (
                    <div className="flex items-center justify-end gap-1">
                      <Input
                        type="number"
                        min="0"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="w-20 h-7 text-sm text-right"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveReorderLevel(stock.id)
                          if (e.key === "Escape") setEditingId(null)
                        }}
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => handleSaveReorderLevel(stock.id)}
                        disabled={isPending}
                      >
                        <Check className="h-3.5 w-3.5 text-green-600" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => setEditingId(null)}
                      >
                        <X className="h-3.5 w-3.5 text-red-500" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-end gap-1 group">
                      <span>{stock.reorder_level}</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => {
                          setEditingId(stock.id)
                          setEditValue(String(stock.reorder_level))
                        }}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  {format(new Date(stock.expiry_date), "dd MMM yyyy")}
                </TableCell>
                <TableCell>{getStatusBadge(stock)}</TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                No stock recorded yet. Record a purchase to populate inventory.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
