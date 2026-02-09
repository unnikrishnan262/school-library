"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Toast, useToast } from "@/components/ui/toast";

interface Category {
  id: string;
  name: string;
}

interface BookCopyInput {
  accessionNumber: string;
  barcode: string;
  condition: string;
}

interface BookFormProps {
  categories: Category[];
  initialData?: {
    id?: string;
    title?: string;
    author?: string;
    isbn?: string;
    publisher?: string;
    edition?: string;
    year?: number | null;
    categoryId?: string;
    language?: string;
    type?: string;
    description?: string;
  };
  mode: "create" | "edit";
}

const BOOK_TYPES = [
  { value: "BOOK", label: "Book" },
  { value: "TEXTBOOK", label: "Textbook" },
  { value: "REFERENCE", label: "Reference" },
  { value: "MAGAZINE", label: "Magazine" },
  { value: "DIGITAL", label: "Digital" },
];

const CONDITIONS = [
  { value: "NEW", label: "New" },
  { value: "GOOD", label: "Good" },
  { value: "FAIR", label: "Fair" },
  { value: "POOR", label: "Poor" },
  { value: "DAMAGED", label: "Damaged" },
];

export function BookForm({ categories, initialData, mode }: BookFormProps) {
  const router = useRouter();
  const { toast, showToast, hideToast } = useToast();
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    title: initialData?.title || "",
    author: initialData?.author || "",
    isbn: initialData?.isbn || "",
    publisher: initialData?.publisher || "",
    edition: initialData?.edition || "",
    year: initialData?.year?.toString() || "",
    categoryId: initialData?.categoryId || "",
    language: initialData?.language || "English",
    type: initialData?.type || "BOOK",
    description: initialData?.description || "",
  });

  const [copies, setCopies] = useState<BookCopyInput[]>(
    mode === "create" ? [{ accessionNumber: "", barcode: "", condition: "GOOD" }] : []
  );

  function updateForm(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function addCopy() {
    setCopies((prev) => [...prev, { accessionNumber: "", barcode: "", condition: "GOOD" }]);
  }

  function removeCopy(index: number) {
    setCopies((prev) => prev.filter((_, i) => i !== index));
  }

  function updateCopy(index: number, field: string, value: string) {
    setCopies((prev) =>
      prev.map((c, i) => (i === index ? { ...c, [field]: value } : c))
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const url = mode === "create" ? "/api/books" : `/api/books/${initialData?.id}`;
    const method = mode === "create" ? "POST" : "PUT";

    const payload = {
      ...form,
      ...(mode === "create" && {
        copies: copies.filter((c) => c.accessionNumber.trim()),
      }),
    };

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setLoading(false);

    if (res.ok) {
      const book = await res.json();
      showToast(
        mode === "create" ? "Book added successfully" : "Book updated",
        "success"
      );
      setTimeout(() => router.push(`/books/${book.id}`), 1000);
    } else {
      const data = await res.json();
      showToast(data.error || "Something went wrong", "error");
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Book Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => updateForm("title", e.target.value)}
                placeholder="Enter book title"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="author">Author *</Label>
              <Input
                id="author"
                value={form.author}
                onChange={(e) => updateForm("author", e.target.value)}
                placeholder="Author name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="isbn">ISBN</Label>
              <Input
                id="isbn"
                value={form.isbn}
                onChange={(e) => updateForm("isbn", e.target.value)}
                placeholder="978-..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="publisher">Publisher</Label>
              <Input
                id="publisher"
                value={form.publisher}
                onChange={(e) => updateForm("publisher", e.target.value)}
                placeholder="Publisher name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edition">Edition</Label>
              <Input
                id="edition"
                value={form.edition}
                onChange={(e) => updateForm("edition", e.target.value)}
                placeholder="e.g. 3rd"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="year">Year</Label>
              <Input
                id="year"
                type="number"
                value={form.year}
                onChange={(e) => updateForm("year", e.target.value)}
                placeholder="2024"
                min="1900"
                max={new Date().getFullYear() + 1}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="language">Language</Label>
              <Input
                id="language"
                value={form.language}
                onChange={(e) => updateForm("language", e.target.value)}
                placeholder="English"
              />
            </div>
            <div className="space-y-2">
              <Label>Category *</Label>
              <Select
                value={form.categoryId}
                onValueChange={(v) => updateForm("categoryId", v)}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={form.type}
                onValueChange={(v) => updateForm("type", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BOOK_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                value={form.description}
                onChange={(e) => updateForm("description", e.target.value)}
                placeholder="Optional description"
              />
            </div>
          </CardContent>
        </Card>

        {mode === "create" && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Book Copies</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addCopy}>
                <Plus className="h-4 w-4 mr-1" /> Add Copy
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {copies.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No copies added yet. Click "Add Copy" to add physical copies.
                </p>
              )}
              {copies.map((copy, i) => (
                <div key={i} className="flex items-end gap-3 p-3 rounded-md border">
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
                  <div className="w-32 space-y-1">
                    <Label className="text-xs">Condition</Label>
                    <Select
                      value={copy.condition}
                      onValueChange={(v) => updateCopy(i, "condition", v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CONDITIONS.map((c) => (
                          <SelectItem key={c.value} value={c.value}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeCopy(i)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <div className="flex gap-3">
          <Button type="submit" disabled={loading}>
            {loading ? "Saving..." : mode === "create" ? "Add Book" : "Save Changes"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
    </>
  );
}
