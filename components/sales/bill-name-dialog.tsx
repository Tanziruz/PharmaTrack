"use client"

import { useState } from "react"
import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface BillNameDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onGenerate: (customerName: string) => void
}

export function BillNameDialog({
  open,
  onOpenChange,
  onGenerate,
}: BillNameDialogProps) {
  const [customerName, setCustomerName] = useState("")

  const handleConfirm = () => {
    onGenerate(customerName.trim())
    setCustomerName("")
    onOpenChange(false)
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) setCustomerName("")
    onOpenChange(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Generate Bill</DialogTitle>
          <DialogDescription>
            Enter the customer&apos;s name to include it on the bill. You may
            leave it blank to skip.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <Label htmlFor="customer-name">Customer Name</Label>
          <Input
            id="customer-name"
            placeholder="e.g. John Doe"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
            autoFocus
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>
            <Download className="h-4 w-4 mr-1" />
            Download Bill
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
