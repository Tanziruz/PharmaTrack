import { getStocks } from "@/lib/actions/stocks"
import { StocksTable } from "@/components/stocks/stocks-table"

export default async function StocksPage() {
  const stocks = await getStocks()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Stocks</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Current inventory — click the reorder level to edit it inline
        </p>
      </div>

      <div className="flex gap-4 text-sm">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-red-100 border border-red-300" />
          Expired / expiring ≤ 60 days
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-orange-100 border border-orange-300" />
          Low stock (below reorder level)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-gray-100 border border-gray-300" />
          Out of stock
        </span>
      </div>

      <StocksTable stocks={stocks ?? []} />
    </div>
  )
}
