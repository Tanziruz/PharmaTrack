"use client"

import { useTransition } from "react"
import { toast } from "sonner"
import { markAsOrdered, deleteOrderEntry } from "@/lib/actions/to-order"
import type { ToBeOrdered } from "@/lib/types/database"
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
import { CheckCircle2, Trash2 } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

const reasonConfig: Record<
  ToBeOrdered["reason"],
  { label: string; className: string }
> = {
  out_of_stock:   { label: "Out of Stock",   className: "bg-gray-100 text-gray-700 border-gray-300" },
  low_stock:      { label: "Low Stock",      className: "bg-orange-100 text-orange-700 border-orange-300" },
  expiring_soon:  { label: "Expiring Soon",  className: "bg-red-100 text-red-700 border-red-300" },
  manual:         { label: "Manual",         className: "bg-blue-100 text-blue-700 border-blue-300" },
}

interface ToOrderTableProps {
  items: ToBeOrdered[]
  showActions?: boolean
}

export function ToOrderTable({ items, showActions = true }: ToOrderTableProps) {
  const [isPending, startTransition] = useTransition()

  const handleMarkOrdered = (id: string) => {
    startTransition(async () => {
      const result = await markAsOrdered(id)
      if (result.success) toast.success(result.message)
      else toast.error(result.message)
    })
  }

  const handleDelete = (id: string) => {
    startTransition(async () => {
      const result = await deleteOrderEntry(id)
      if (result.success) toast.success(result.message)
      else toast.error(result.message)
    })
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Medicine</TableHead>
            <TableHead>Batch No.</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead>Notes</TableHead>
            <TableHead>Added On</TableHead>
            {showActions && <TableHead className="text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length > 0 ? (
            items.map((item) => {
              const config = reasonConfig[item.reason]
              return (
                <TableRow
                  key={item.id}
                  className={cn(item.is_ordered && "opacity-50 line-through")}
                >
                  <TableCell className="font-medium">{item.medicine_name}</TableCell>
                  <TableCell>
                    {item.batch_number ? (
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                        {item.batch_number}
                      </code>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`text-[11px] ${config.className} hover:${config.className}`}
                    >
                      {config.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {item.quantity_needed > 0 ? (
                      <span className="font-semibold">{item.quantity_needed}</span>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {item.notes ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {format(new Date(item.created_at), "dd MMM yyyy")}
                  </TableCell>
                  {showActions && (
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1"
                          onClick={() => handleMarkOrdered(item.id)}
                          disabled={isPending}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                          Ordered
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => handleDelete(item.id)}
                          disabled={isPending}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              )
            })
          ) : (
            <TableRow>
              <TableCell
                colSpan={showActions ? 7 : 6}
                className="text-center py-12 text-muted-foreground"
              >
                {showActions
                  ? "No pending orders. All stocks are healthy!"
                  : "No completed orders yet."}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
