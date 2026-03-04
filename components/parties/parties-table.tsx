"use client"

import { useActionState, useEffect, useRef, useTransition } from "react"
import { toast } from "sonner"
import { addParty, deleteParty, type PartyActionState } from "@/lib/actions/parties"
import type { Party } from "@/lib/types/database"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Trash2, Building2 } from "lucide-react"
import { format } from "date-fns"

const initialState: PartyActionState = { success: false, message: "" }

interface PartiesTableProps {
  parties: Party[]
}

export function PartiesTable({ parties }: PartiesTableProps) {
  const [state, formAction, pending] = useActionState(addParty, initialState)
  const [isDeleting, startDelete] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state.message) {
      if (state.success) {
        toast.success(state.message)
        formRef.current?.reset()
      } else {
        toast.error(state.message)
      }
    }
  }, [state])

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Delete party "${name}"? This will not remove existing purchase records.`)) return
    startDelete(async () => {
      const result = await deleteParty(id)
      if (result.success) toast.success(result.message)
      else toast.error(result.message)
    })
  }

  return (
    <div className="space-y-6">
      {/* Add Party inline form */}
      <div className="rounded-lg border p-4 bg-muted/30">
        <h2 className="text-sm font-semibold mb-3">Add New Party / Manufacturer</h2>
        <form ref={formRef} action={formAction} className="flex items-end gap-3">
          <div className="flex-1 space-y-1">
            <Label htmlFor="party_name" className="text-xs">Party Name</Label>
            <Input
              id="party_name"
              name="name"
              placeholder="e.g. Sun Pharma, Cipla Ltd."
              className="h-9"
              required
            />
            {state.errors?.name && (
              <p className="text-xs text-destructive">{state.errors.name[0]}</p>
            )}
          </div>
          <Button type="submit" size="sm" disabled={pending} className="h-9">
            {pending ? "Adding…" : "Add Party"}
          </Button>
        </form>
      </div>

      {/* Parties list */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Party / Manufacturer Name</TableHead>
              <TableHead>Added On</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {parties.length > 0 ? (
              parties.map((party) => (
                <TableRow key={party.id}>
                  <TableCell className="font-medium flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                    {party.name}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(party.created_at), "dd MMM yyyy")}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => handleDelete(party.id, party.name)}
                      disabled={isDeleting}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-12 text-muted-foreground">
                  No parties added yet. Add the manufacturers you buy from above.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
