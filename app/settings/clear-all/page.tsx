"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { purgeAllData } from "@/lib/actions/settings"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { AlertTriangle, ArrowLeft, Loader2, Trash2 } from "lucide-react"
import Link from "next/link"

const CONFIRMATION_TEXT = "DELETE ALL DATA"

export default function ClearAllPage() {
  const [confirmation, setConfirmation] = useState("")
  const [isPurging, setIsPurging] = useState(false)
  const router = useRouter()

  const isConfirmed = confirmation === CONFIRMATION_TEXT

  async function handlePurge() {
    if (!isConfirmed) return
    setIsPurging(true)
    try {
      const result = await purgeAllData()
      if (result.success) {
        toast.success(result.message)
        setConfirmation("")
        router.push("/settings")
      } else {
        toast.error(result.message)
      }
    } catch {
      toast.error("An unexpected error occurred while purging data.")
    } finally {
      setIsPurging(false)
    }
  }

  return (
    <div className="space-y-6 max-w-xl">
      <div className="flex items-center gap-3">
        <Link href="/settings">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clear All Data</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Permanently remove every record from the database
          </p>
        </div>
      </div>

      <Card className="border-destructive/50">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <CardTitle className="text-red-600">Danger Zone</CardTitle>
              <CardDescription>
                This will permanently delete <strong>all</strong> data including
                stocks, purchases, sales, to-be-ordered items, and parties.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-800 space-y-2">
            <p className="font-semibold">This action cannot be undone.</p>
            <ul className="list-disc list-inside space-y-1">
              <li>All stock records will be deleted</li>
              <li>All purchase history will be deleted</li>
              <li>All sales records will be deleted</li>
              <li>All to-be-ordered items will be deleted</li>
              <li>All parties / suppliers will be deleted</li>
            </ul>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmation">
              Type <span className="font-mono font-bold text-red-600">{CONFIRMATION_TEXT}</span> to
              confirm
            </Label>
            <Input
              id="confirmation"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              placeholder={CONFIRMATION_TEXT}
              disabled={isPurging}
              autoComplete="off"
            />
          </div>
        </CardContent>

        <CardFooter>
          <Button
            variant="destructive"
            disabled={!isConfirmed || isPurging}
            onClick={handlePurge}
            className="w-full"
          >
            {isPurging ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Purging…
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Purge All Data
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
