"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Toast, useToast } from "@/components/ui/toast";

interface CopyInput {
  accessionNumber: string;
  barcode: string;
  condition: string;
}

export function AddCopiesDialog({ bookId }: { bookId: string }) {
  const router = useRouter();
  const { toast, showToast, hideToast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copies, setCopies] = useState<CopyInput[]>([
    { accessionNumber: "", barcode: "", condition: "GOOD" },
  ]);

  function addCopy() {
    setCopies((p) => [...p, { accessionNumber: "", barcode: "", condition: "GOOD" }]);
  }

  function removeCopy(i: number) {
    setCopies((p) => p.filter((_, idx) => idx !== i));
  }

  function updateCopy(i: number, field: string, value: string) {
    setCopies((p) => p.map((c, idx) => (idx === i ? { ...c, [field]: value } : c)));
  }

  async function handleSubmit() {
    const valid = copies.filter((c) => c.accessionNumber.trim());
    if (!valid.length) {
      showToast("Enter at least one accession number", "error");
      return;
    }
    setLoading(true);
    const res = await fetch(`/api/books/${bookId}/copies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ copies: valid }),
    });
    setLoading(false);
    if (res.ok) {
      showToast(`${valid.length} copy/copies added`, "success");
      setOpen(false);
      setCopies([{ accessionNumber: "", barcode: "", condition: "GOOD" }]);
      router.refresh();
    } else {
      const data = await res.json();
      showToast(data.error || "Failed to add copies", "error");
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1" /> Add Copies
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Book Copies</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-96 overflow-y-auto py-1">
            {copies.map((copy, i) => (
              <div key={i} className="flex items-end gap-2 p-3 rounded-md border">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Accession No. *</Label>
                  <Input
                    value={copy.accessionNumber}
                    onChange={(e) => updateCopy(i, "accessionNumber", e.target.value)}
                    placeholder="e.g. ACC001"
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Barcode</Label>
                  <Input
                    value={copy.barcode}
                    onChange={(e) => updateCopy(i, "barcode", e.target.value)}
                    placeholder="Scan or enter"
                  />
                </div>
                <div className="w-28 space-y-1">
                  <Label className="text-xs">Condition</Label>
                  <Select
                    value={copy.condition}
                    onValueChange={(v) => updateCopy(i, "condition", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["NEW", "GOOD", "FAIR", "POOR", "DAMAGED"].map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeCopy(i)}
                  disabled={copies.length === 1}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addCopy}>
            <Plus className="h-4 w-4 mr-1" /> Add Another
          </Button>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? "Adding..." : "Add Copies"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
    </>
  );
}
