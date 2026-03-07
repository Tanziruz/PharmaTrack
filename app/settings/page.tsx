import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Trash2 } from "lucide-react"

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage application preferences and data
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Link href="/settings/clear-all">
          <Card className="hover:border-destructive/50 hover:shadow-md transition-all cursor-pointer">
            <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-red-50">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <CardTitle className="text-base">Clear All Data</CardTitle>
                <CardDescription className="text-xs">
                  Permanently delete all records
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Purge all stocks, purchases, sales, and orders from the
                database. Party names are preserved. This action cannot be undone.
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}
