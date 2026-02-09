"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Toast, useToast } from "@/components/ui/toast";

interface Category {
  id: string;
  name: string;
  description: string | null;
  _count: { books: number };
}

export function CategoriesManager({ initialCategories }: { initialCategories: Category[] }) {
  const { toast, showToast, hideToast } = useToast();
  const [categories, setCategories] = useState(initialCategories);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");

  async function handleAdd() {
    if (!newName.trim()) return;
    setAdding(true);
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, description: newDesc }),
    });
    setAdding(false);
    if (res.ok) {
      const cat = await res.json();
      setCategories((p) => [...p, { ...cat, _count: { books: 0 } }].sort((a, b) => a.name.localeCompare(b.name)));
      setNewName("");
      setNewDesc("");
      showToast("Category created", "success");
    } else {
      const data = await res.json();
      showToast(data.error || "Failed", "error");
    }
  }

  function startEdit(cat: Category) {
    setEditId(cat.id);
    setEditName(cat.name);
    setEditDesc(cat.description || "");
  }

  async function saveEdit(id: string) {
    const res = await fetch(`/api/categories/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName, description: editDesc }),
    });
    if (res.ok) {
      setCategories((p) =>
        p.map((c) => (c.id === id ? { ...c, name: editName, description: editDesc || null } : c))
      );
      setEditId(null);
      showToast("Category updated", "success");
    } else {
      const data = await res.json();
      showToast(data.error || "Failed", "error");
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete category "${name}"?`)) return;
    const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
    if (res.ok) {
      setCategories((p) => p.filter((c) => c.id !== id));
      showToast("Category deleted", "success");
    } else {
      const data = await res.json();
      showToast(data.error || "Failed", "error");
    }
  }

  return (
    <>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Add Category</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-3">
          <Input
            placeholder="Category name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <Input
            placeholder="Description (optional)"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <Button onClick={handleAdd} disabled={adding || !newName.trim()}>
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Categories ({categories.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-center">Books</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((cat) => (
                <TableRow key={cat.id}>
                  <TableCell>
                    {editId === cat.id ? (
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="h-8"
                        autoFocus
                      />
                    ) : (
                      <span className="font-medium">{cat.name}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {editId === cat.id ? (
                      <Input
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        className="h-8"
                        placeholder="Description"
                      />
                    ) : (
                      cat.description || "—"
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">{cat._count.books}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {editId === cat.id ? (
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => saveEdit(cat.id)}>
                          <Check className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setEditId(null)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => startEdit(cat)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(cat.id, cat.name)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
    </>
  );
}
