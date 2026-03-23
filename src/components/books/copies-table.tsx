"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Toast, useToast } from "@/components/ui/toast";

interface BookCopy {
  id: string;
  accessionNumber: string;
  barcode: string | null;
  condition: string;
  status: string;
}

const STATUS_VARIANTS: Record<string, "success" | "destructive" | "warning" | "secondary"> = {
  AVAILABLE: "success",
  ISSUED: "destructive",
  RESERVED: "warning",
  LOST: "secondary",
  DAMAGED: "secondary",
};

export function CopiesTable({
  bookId,
  copies,
  canManage,
}: {
  bookId: string;
  copies: BookCopy[];
  canManage: boolean;
}) {
  const router = useRouter();
  const { toast, showToast, hideToast } = useToast();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(copyId: string) {
    if (!confirm("Delete this copy? This cannot be undone.")) return;
    setDeletingId(copyId);
    const res = await fetch(`/api/books/${bookId}/copies?copyId=${copyId}`, {
      method: "DELETE",
    });
    setDeletingId(null);
    if (res.ok) {
      showToast("Copy deleted", "success");
      router.refresh();
    } else {
      const data = await res.json();
      showToast(data.error || "Failed to delete copy", "error");
    }
  }

  if (copies.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        No copies added yet.
      </p>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Accession No.</TableHead>
            <TableHead>Barcode</TableHead>
            <TableHead>Condition</TableHead>
            <TableHead>Status</TableHead>
            {canManage && <TableHead className="w-12" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {copies.map((copy) => (
            <TableRow key={copy.id}>
              <TableCell className="font-mono font-medium">{copy.accessionNumber}</TableCell>
              <TableCell className="text-muted-foreground">{copy.barcode || "—"}</TableCell>
              <TableCell>{copy.condition}</TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANTS[copy.status] || "secondary"}>
                  {copy.status}
                </Badge>
              </TableCell>
              {canManage && (
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(copy.id)}
                    disabled={deletingId === copy.id}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
    </>
  );
}
