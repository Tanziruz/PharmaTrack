import { getToBeOrdered } from "@/lib/actions/to-order"
import { ToOrderTable } from "@/components/to-order/to-order-table"
import { AddManualOrderDialog } from "@/components/to-order/add-manual-order-dialog"

export default async function ToOrderPage() {
  const items = await getToBeOrdered()

  const pending = items?.filter((i) => !i.is_ordered) ?? []
  const ordered = items?.filter((i) => i.is_ordered) ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">To Be Ordered</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Medicines that need replenishment — auto-populated from stock triggers
          </p>
        </div>
        <AddManualOrderDialog />
      </div>

      <div className="space-y-8">
        <section>
          <h2 className="text-base font-semibold mb-3">
            Pending{" "}
            {pending.length > 0 && (
              <span className="ml-1 text-xs font-normal bg-destructive text-destructive-foreground rounded-full px-2 py-0.5">
                {pending.length}
              </span>
            )}
          </h2>
          <ToOrderTable items={pending} />
        </section>

        {ordered.length > 0 && (
          <section>
            <h2 className="text-base font-semibold mb-3 text-muted-foreground">Ordered</h2>
            <ToOrderTable items={ordered} showActions={false} />
          </section>
        )}
      </div>
    </div>
  )
}
