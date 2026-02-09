"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, AlertTriangle, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarcodeInput } from "./barcode-input";
import { Toast, useToast } from "@/components/ui/toast";
import { formatDate, calculateDaysOverdue } from "@/lib/utils";

interface ActiveTransaction {
  id: string;
  issueDate: string;
  dueDate: string;
  renewCount: number;
  bookCopy: {
    accessionNumber: string;
    book: { title: string; author: string };
  };
  student?: { user: { name: string }; admissionNumber: string } | null;
  staff?: { user: { name: string }; staffId: string } | null;
}

interface BookCopyWithTransaction {
  id: string;
  accessionNumber: string;
  status: string;
  book: { title: string; author: string };
  transactions: ActiveTransaction[];
}

export function ReturnForm() {
  const router = useRouter();
  const { toast, showToast, hideToast } = useToast();

  const [bookQuery, setBookQuery] = useState("");
  const [found, setFound] = useState<BookCopyWithTransaction | null>(null);
  const [activeTransaction, setActiveTransaction] = useState<ActiveTransaction | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [returnDate, setReturnDate] = useState(new Date().toISOString().split("T")[0]);
  const [estimatedFine, setEstimatedFine] = useState<number | null>(null);

  const lookupBook = useCallback(async (query: string) => {
    if (!query.trim()) return;
    setLoading(true);
    setFound(null);
    setActiveTransaction(null);
    setEstimatedFine(null);

    const res = await fetch(`/api/book-copies/lookup?q=${encodeURIComponent(query)}`);
    setLoading(false);

    if (res.ok) {
      const data = await res.json();
      if (data.status !== "ISSUED") {
        showToast(`This copy is ${data.status.toLowerCase()}, not currently issued`, "error");
        return;
      }
      setFound(data);
      const tx = data.transactions[0];
      if (tx) {
        setActiveTransaction(tx);
        // Estimate fine
        const due = new Date(tx.dueDate);
        const ret = new Date(returnDate);
        if (ret > due) {
          const daysLate = calculateDaysOverdue(tx.dueDate);
          setEstimatedFine(daysLate); // will be refined by server
        }
      }
    } else {
      showToast("Book copy not found", "error");
    }
  }, [showToast, returnDate]);

  async function handleReturn() {
    if (!activeTransaction) return;
    setSubmitting(true);

    const res = await fetch("/api/circulation/return", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transactionId: activeTransaction.id, returnDate }),
    });

    setSubmitting(false);
    if (res.ok) {
      const data = await res.json();
      const fineMsg = data.fineAmount > 0 ? ` Fine: ₹${data.fineAmount.toFixed(2)}` : "";
      showToast(`Book returned successfully.${fineMsg}`, "success");
      setTimeout(() => {
        setBookQuery("");
        setFound(null);
        setActiveTransaction(null);
        setEstimatedFine(null);
        router.refresh();
      }, 2000);
    } else {
      const d = await res.json();
      showToast(d.error || "Return failed", "error");
    }
  }

  const memberName = activeTransaction?.student?.user.name || activeTransaction?.staff?.user.name || "Unknown";
  const memberId = activeTransaction?.student?.admissionNumber || activeTransaction?.staff?.staffId || "";
  const daysOverdue = activeTransaction ? calculateDaysOverdue(activeTransaction.dueDate) : 0;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" /> Scan Book to Return
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <BarcodeInput
            value={bookQuery}
            onChange={setBookQuery}
            onScan={lookupBook}
            placeholder="Scan barcode / enter accession no."
            autoFocus
          />
          <Button
            variant="outline"
            className="w-full"
            onClick={() => lookupBook(bookQuery)}
            disabled={!bookQuery.trim() || loading}
          >
            {loading ? "Looking up..." : "Look Up"}
          </Button>
        </CardContent>
      </Card>

      {activeTransaction && found && (
        <Card>
          <CardHeader>
            <CardTitle>Transaction Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Book</p>
                <p className="font-medium">{found.book.title}</p>
                <p className="text-muted-foreground text-xs">{found.book.author}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Borrower</p>
                <p className="font-medium">{memberName}</p>
                <p className="text-muted-foreground text-xs">{memberId}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Issued On</p>
                <p className="font-medium">{formatDate(activeTransaction.issueDate)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Due Date</p>
                <p className={`font-medium ${daysOverdue > 0 ? "text-destructive" : ""}`}>
                  {formatDate(activeTransaction.dueDate)}
                  {daysOverdue > 0 && ` (${daysOverdue} day${daysOverdue > 1 ? "s" : ""} late)`}
                </p>
              </div>
            </div>

            {daysOverdue > 0 && (
              <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4" />
                <span>Overdue by {daysOverdue} day(s). Fine will be calculated on return.</span>
              </div>
            )}

            <div className="flex items-end gap-3">
              <div className="space-y-1 flex-1">
                <Label className="text-xs">Return Date</Label>
                <Input
                  type="date"
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                  max={new Date().toISOString().split("T")[0]}
                />
              </div>
              {activeTransaction.renewCount < 2 && (
                <Button
                  variant="outline"
                  onClick={async () => {
                    const res = await fetch("/api/circulation/renew", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ transactionId: activeTransaction.id }),
                    });
                    if (res.ok) {
                      showToast("Book renewed", "success");
                      router.refresh();
                      setFound(null);
                      setActiveTransaction(null);
                      setBookQuery("");
                    } else {
                      const d = await res.json();
                      showToast(d.error || "Renewal failed", "error");
                    }
                  }}
                >
                  Renew ({activeTransaction.renewCount}/2)
                </Button>
              )}
            </div>

            <Button className="w-full" size="lg" onClick={handleReturn} disabled={submitting}>
              {submitting ? "Processing..." : (
                <span className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Confirm Return{daysOverdue > 0 ? " & Collect Fine" : ""}
                </span>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
    </>
  );
}
