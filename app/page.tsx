import { getStockSummary } from "@/lib/actions/stocks"
import { getTodaySalesTotal } from "@/lib/actions/sales"
import { getPendingOrderCount } from "@/lib/actions/to-order"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Package,
  AlertTriangle,
  Clock,
  ShoppingBag,
  ClipboardList,
} from "lucide-react"

export default async function DashboardPage() {
  const [summary, todayTotal, pendingOrders] = await Promise.all([
    getStockSummary(),
    getTodaySalesTotal(),
    getPendingOrderCount(),
  ])

  const stats = [
    {
      label: "Total Products",
      value: summary.total,
      sub: "unique medicine batches",
      icon: Package,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Low Stock",
      value: summary.lowStock,
      sub: `${summary.outOfStock} out of stock`,
      icon: AlertTriangle,
      color: "text-orange-600",
      bg: "bg-orange-50",
    },
    {
      label: "Expiring Soon",
      value: summary.expiringSoon,
      sub: "within 60 days",
      icon: Clock,
      color: "text-red-600",
      bg: "bg-red-50",
    },
    {
      label: "Today's Sales",
      value: `₹${todayTotal.toFixed(2)}`,
      sub: "total revenue today",
      icon: ShoppingBag,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      label: "Pending Orders",
      value: pendingOrders,
      sub: "medicines to reorder",
      icon: ClipboardList,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Pharmacy inventory overview
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
              <div className={`rounded-md p-1.5 ${stat.bg}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{stat.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="rounded-lg border bg-muted/30 p-6 text-sm text-muted-foreground">
        <p className="font-medium text-foreground mb-1">Quick start</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Go to <strong>Purchases</strong> to record incoming stock batches.</li>
          <li>Go to <strong>Sales</strong> to record medicines sold to customers.</li>
          <li>Check <strong>Stocks</strong> for live inventory with expiry alerts.</li>
          <li>Check <strong>To Be Ordered</strong> for medicines that need replenishment.</li>
        </ul>
      </div>
    </div>
  )
}
