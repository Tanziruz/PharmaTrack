"use client"

import { useTransition, useState } from "react"
import { toast } from "sonner"
import { markAsOrdered, undoMarkAsOrdered, deleteOrderEntry } from "@/lib/actions/to-order"
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
import { CheckCircle2, Trash2, Undo2, Search } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"

const reasonConfig: Record<
  ToBeOrdered["reason"],
  { label: string; className: string }
> = {
  out_of_stock:   { label: "Out of Stock",   className: "bg-gray-100 text-gray-700 border-gray-300" },
  low_stock:      { label: "Low Stock",      className: "bg-orange-100 text-orange-700 border-orange-300" },
  expiring_soon:  { label: "Expired",        className: "bg-red-100 text-red-700 border-red-300" },
  manual:         { label: "Manual",         className: "bg-blue-100 text-blue-700 border-blue-300" },
}

type ReasonFilter = "all" | ToBeOrdered["reason"]

const reasonOptions: { value: ReasonFilter; label: string }[] = [
  { value: "all",           label: "All"          },
  { value: "out_of_stock",  label: "Out of Stock" },
  { value: "low_stock",     label: "Low Stock"    },
  { value: "expiring_soon", label: "Expired"      },
  { value: "manual",        label: "Manual"       },
]

interface ToOrderTableProps {
  items: ToBeOrdered[]
  showActions?: boolean
}

export function ToOrderTable({ items, showActions = true }: ToOrderTableProps) {
  const [isPending, startTransition] = useTransition()
  const [query, setQuery] = useState("")
  const [reasonFilter, setReasonFilter] = useState<ReasonFilter>("all")

  const filtered = items
    .filter((i) => reasonFilter === "all" || i.reason === reasonFilter)
    .filter(
      (i) =>
        !query.trim() ||
        i.medicine_name.toLowerCase().includes(query.toLowerCase()) ||
        (i.batch_number ?? "").toLowerCase().includes(query.toLowerCase()),
    )

  const handleMarkOrdered = (id: string) => {
    startTransition(async () => {
      const result = await markAsOrdered(id)
      if (result.success) toast.success(result.message)
      else toast.error(result.message)
    })
  }

  const handleUndo = (id: string) => {
    startTransition(async () => {
      const result = await undoMarkAsOrdered(id)
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
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by medicine or batch…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-8 h-9 w-full max-w-sm"
        />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {reasonOptions.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setReasonFilter(opt.value)}
            className={cn(
              "px-2.5 py-1 rounded-full text-xs font-medium border transition-colors",
              reasonFilter === opt.value
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-muted-foreground border-border hover:bg-muted",
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Medicine</TableHead>
            <TableHead>Batch No.</TableHead>
            <TableHead>Supplier</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead className="text-right">Qty Needed</TableHead>
            <TableHead>Notes</TableHead>
            <TableHead>Added On</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length > 0 ? (
            filtered.map((item) => {
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
                  <TableCell className="text-sm text-muted-foreground">
                    {item.supplier_name ?? <span className="opacity-50">—</span>}
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
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {showActions ? (
                        <>
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
                        </>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1"
                          onClick={() => handleUndo(item.id)}
                          disabled={isPending}
                        >
                          <Undo2 className="h-3.5 w-3.5 text-orange-600" />
                          Undo
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )
            })
          ) : (
            <TableRow>
              <TableCell
                colSpan={8}
                className="text-center py-12 text-muted-foreground"
              >
                {query || reasonFilter !== "all"
                  ? "No entries match your filters."
                  : showActions
                  ? "No pending orders. All stocks are healthy!"
                  : "No completed orders yet."}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
    </div>  )
}