import { getPurchases } from "@/lib/actions/purchases"
import { getParties } from "@/lib/actions/parties"
import { AddPurchaseDialog } from "@/components/purchases/add-purchase-dialog"
import { PurchasesTable } from "@/components/purchases/purchases-table"

export default async function PurchasesPage() {
  const [purchases, parties] = await Promise.all([getPurchases(), getParties()])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Purchases</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Record and view all incoming stock batches
          </p>
        </div>
        <AddPurchaseDialog parties={parties} />
      </div>

      <PurchasesTable purchases={purchases ?? []} parties={parties} />
    </div>
  )
}
