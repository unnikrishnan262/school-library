"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, CheckCircle, BookOpen, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarcodeInput } from "./barcode-input";
import { Toast, useToast } from "@/components/ui/toast";

interface BookCopyResult {
  id: string;
  accessionNumber: string;
  barcode: string | null;
  status: string;
  condition: string;
  book: { title: string; author: string; category: { name: string } };
}

interface MemberResult {
  type: "student" | "staff";
  id: string;
  name: string;
  identifier: string;
  detail: string;
  isActive: boolean;
  activeIssues: number;
}

export function IssueForm({ defaultDueDays }: { defaultDueDays: number }) {
  const router = useRouter();
  const { toast, showToast, hideToast } = useToast();

  const [bookQuery, setBookQuery] = useState("");
  const [memberQuery, setMemberQuery] = useState("");
  const [selectedCopy, setSelectedCopy] = useState<BookCopyResult | null>(null);
  const [selectedMember, setSelectedMember] = useState<MemberResult | null>(null);
  const [memberResults, setMemberResults] = useState<MemberResult[]>([]);
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + defaultDueDays);
    return d.toISOString().split("T")[0];
  });
  const [notes, setNotes] = useState("");
  const [loadingBook, setLoadingBook] = useState(false);
  const [loadingMember, setLoadingMember] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const lookupBook = useCallback(async (query: string) => {
    if (!query.trim()) return;
    setLoadingBook(true);
    setSelectedCopy(null);
    const res = await fetch(`/api/book-copies/lookup?q=${encodeURIComponent(query)}`);
    setLoadingBook(false);
    if (res.ok) {
      const data = await res.json();
      if (data.status !== "AVAILABLE") {
        showToast(`Copy is ${data.status.toLowerCase()} — not available`, "error");
      } else {
        setSelectedCopy(data);
      }
    } else {
      showToast("Book copy not found", "error");
    }
  }, [showToast]);

  const searchMembers = useCallback(async (query: string) => {
    if (!query.trim()) { setMemberResults([]); return; }
    setLoadingMember(true);
    const res = await fetch(`/api/members/lookup?q=${encodeURIComponent(query)}`);
    setLoadingMember(false);
    if (res.ok) setMemberResults(await res.json());
  }, []);

  async function handleIssue() {
    if (!selectedCopy || !selectedMember) return;
    setSubmitting(true);

    const res = await fetch("/api/circulation/issue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bookCopyId: selectedCopy.id,
        memberId: selectedMember.id,
        memberType: selectedMember.type,
        dueDate,
        notes,
      }),
    });

    setSubmitting(false);
    if (res.ok) {
      showToast(`"${selectedCopy.book.title}" issued to ${selectedMember.name}`, "success");
      // Reset for next transaction
      setTimeout(() => {
        setBookQuery("");
        setMemberQuery("");
        setSelectedCopy(null);
        setSelectedMember(null);
        setMemberResults([]);
        setNotes("");
        router.refresh();
      }, 1500);
    } else {
      const d = await res.json();
      showToast(d.error || "Issue failed", "error");
    }
  }

  return (
    <>
      <div className="grid gap-6 md:grid-cols-2">
        {/* Book */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" /> Step 1: Scan Book
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
              disabled={!bookQuery.trim() || loadingBook}
            >
              {loadingBook ? "Looking up..." : "Look Up"}
            </Button>

            {selectedCopy && (
              <div className="rounded-md border p-3 bg-muted/30 space-y-1">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="font-medium">{selectedCopy.book.title}</span>
                </div>
                <p className="text-sm text-muted-foreground">{selectedCopy.book.author}</p>
                <div className="flex gap-2 text-xs">
                  <Badge variant="outline">{selectedCopy.accessionNumber}</Badge>
                  <Badge variant="outline">{selectedCopy.book.category.name}</Badge>
                  <Badge variant="success">{selectedCopy.condition}</Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Member */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" /> Step 2: Find Member
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={memberQuery}
                onChange={(e) => {
                  setMemberQuery(e.target.value);
                  searchMembers(e.target.value);
                }}
                placeholder="Name, admission no., or staff ID"
                className="pl-9"
              />
            </div>

            {loadingMember && <p className="text-sm text-muted-foreground">Searching...</p>}

            {memberResults.length > 0 && !selectedMember && (
              <div className="border rounded-md divide-y">
                {memberResults.map((m) => (
                  <button
                    key={`${m.type}-${m.id}`}
                    className="w-full text-left px-3 py-2 hover:bg-muted transition-colors"
                    onClick={() => {
                      setSelectedMember(m);
                      setMemberResults([]);
                      setMemberQuery(m.name);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium">{m.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">({m.identifier})</span>
                      </div>
                      <Badge variant={m.type === "student" ? "outline" : "secondary"}>
                        {m.type}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{m.detail}</p>
                    {m.activeIssues > 0 && (
                      <p className="text-xs text-warning">{m.activeIssues} book(s) currently issued</p>
                    )}
                  </button>
                ))}
              </div>
            )}

            {selectedMember && (
              <div className="rounded-md border p-3 bg-muted/30 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="font-medium">{selectedMember.name}</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => { setSelectedMember(null); setMemberQuery(""); }}>
                    Change
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">{selectedMember.detail}</p>
                <div className="flex gap-2 text-xs">
                  <Badge variant="outline">{selectedMember.identifier}</Badge>
                  <Badge variant={selectedMember.type === "student" ? "outline" : "secondary"}>
                    {selectedMember.type}
                  </Badge>
                  {selectedMember.activeIssues > 0 && (
                    <Badge variant="warning">{selectedMember.activeIssues} books out</Badge>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Confirm */}
      <Card>
        <CardHeader>
          <CardTitle>Step 3: Confirm Issue</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any special notes..."
              />
            </div>
          </div>

          <Button
            className="w-full"
            size="lg"
            onClick={handleIssue}
            disabled={!selectedCopy || !selectedMember || submitting}
          >
            {submitting ? "Processing..." : "Issue Book"}
          </Button>

          {(!selectedCopy || !selectedMember) && (
            <p className="text-sm text-center text-muted-foreground">
              {!selectedCopy ? "Scan a book " : ""}
              {!selectedCopy && !selectedMember ? "and " : ""}
              {!selectedMember ? "select a member " : ""}
              to continue
            </p>
          )}
        </CardContent>
      </Card>
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
    </>
  );
}
