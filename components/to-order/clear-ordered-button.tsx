"use client"

import { useTransition } from "react"
import { toast } from "sonner"
import { clearAllOrdered } from "@/lib/actions/to-order"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"

export function ClearOrderedButton() {
  const [isPending, startTransition] = useTransition()

  const handleClear = () => {
    startTransition(async () => {
      const result = await clearAllOrdered()
      if (result.success) toast.success(result.message)
      else toast.error(result.message)
    })
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="text-destructive border-destructive/30 hover:bg-destructive/10 gap-1"
      onClick={handleClear}
      disabled={isPending}
    >
      <Trash2 className="h-3.5 w-3.5" />
      Clear All
    </Button>
  )
}
