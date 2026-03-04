import { getParties } from "@/lib/actions/parties"
import { PartiesTable } from "@/components/parties/parties-table"

export default async function PartiesPage() {
  const parties = await getParties()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Parties</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage the manufacturers and suppliers you purchase medicines from
        </p>
      </div>

      <PartiesTable parties={parties} />
    </div>
  )
}
