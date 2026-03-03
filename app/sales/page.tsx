import { getSales } from "@/lib/actions/sales"
import { getStockBatchNumbers } from "@/lib/actions/stocks"
import { RecordSaleDialog } from "@/components/sales/record-sale-dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { format } from "date-fns"

export default async function SalesPage() {
  const [sales, stocks] = await Promise.all([getSales(), getStockBatchNumbers()])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sales</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Record medicines sold to customers
          </p>
        </div>
        <RecordSaleDialog stocks={stocks} />
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {sales && sales.length > 0 ? (
              sales.map((s) => (
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
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  No sales recorded yet. Click &quot;Record Sale&quot; to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
