"use client";

import { useState, useEffect } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Toast, useToast } from "@/components/ui/toast";

export function ClassesSectionsManager() {
  const { toast, showToast, hideToast } = useToast();
  const [classes, setClasses] = useState<string[]>([]);
  const [sections, setSections] = useState<string[]>([]);
  const [newClass, setNewClass] = useState("");
  const [newSection, setNewSection] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/settings/classes-sections")
      .then((r) => r.json())
      .then((data) => {
        setClasses(data.classes ?? []);
        setSections(data.sections ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  function addClass() {
    const val = newClass.trim();
    if (!val || classes.includes(val)) return;
    setClasses((prev) => [...prev, val]);
    setNewClass("");
  }

  function removeClass(c: string) {
    setClasses((prev) => prev.filter((x) => x !== c));
  }

  function addSection() {
    const val = newSection.trim().toUpperCase();
    if (!val || sections.includes(val)) return;
    setSections((prev) => [...prev, val]);
    setNewSection("");
  }

  function removeSection(s: string) {
    setSections((prev) => prev.filter((x) => x !== s));
  }

  async function handleSave() {
    setSaving(true);
    const res = await fetch("/api/settings/classes-sections", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classes, sections }),
    });
    setSaving(false);
    if (res.ok) {
      showToast("Classes and sections saved", "success");
    } else {
      const data = await res.json();
      showToast(data.error || "Failed to save", "error");
    }
  }

  if (loading) return <p className="text-muted-foreground text-sm">Loading...</p>;

  return (
    <>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Classes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {classes.map((c) => (
                <Badge key={c} variant="secondary" className="text-sm px-3 py-1 flex items-center gap-1">
                  Class {c}
                  <button onClick={() => removeClass(c)} className="ml-1 hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {classes.length === 0 && <p className="text-sm text-muted-foreground">No classes configured.</p>}
            </div>
            <div className="flex gap-2 max-w-xs">
              <Input
                placeholder="e.g. 13 or KG"
                value={newClass}
                onChange={(e) => setNewClass(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addClass())}
              />
              <Button type="button" variant="outline" size="icon" onClick={addClass}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sections</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {sections.map((s) => (
                <Badge key={s} variant="secondary" className="text-sm px-3 py-1 flex items-center gap-1">
                  Section {s}
                  <button onClick={() => removeSection(s)} className="ml-1 hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {sections.length === 0 && <p className="text-sm text-muted-foreground">No sections configured.</p>}
            </div>
            <div className="flex gap-2 max-w-xs">
              <Input
                placeholder="e.g. G or H"
                value={newSection}
                onChange={(e) => setNewSection(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSection())}
              />
              <Button type="button" variant="outline" size="icon" onClick={addSection}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
    </>
  );
}
