import { getPurchases } from "@/lib/actions/purchases"
import { AddPurchaseDialog } from "@/components/purchases/add-purchase-dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"

export default async function PurchasesPage() {
  const purchases = await getPurchases()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Purchases</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Record and view all incoming stock batches
          </p>
        </div>
        <AddPurchaseDialog />
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Medicine</TableHead>
              <TableHead>Batch No.</TableHead>
              <TableHead className="text-right">MRP (₹)</TableHead>
              <TableHead className="text-right">Qty Bought</TableHead>
              <TableHead>Expiry Date</TableHead>
              <TableHead>Purchase Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {purchases && purchases.length > 0 ? (
              purchases.map((p) => {
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
                  </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  No purchases recorded yet. Click &quot;Add Purchase&quot; to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
