import { getSales } from "@/lib/actions/sales"
import { getStockBatchNumbers } from "@/lib/actions/stocks"
import { RecordSaleDialog } from "@/components/sales/record-sale-dialog"
import { SalesTable } from "@/components/sales/sales-table"
import { SalesHistoryDialog } from "@/components/sales/sales-history-dialog"

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
        <div className="flex items-center gap-2">
          <SalesHistoryDialog sales={sales ?? []} />
          <RecordSaleDialog stocks={stocks} />
        </div>
      </div>

      <SalesTable sales={sales ?? []} />
    </div>
  )
}
