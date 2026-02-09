"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Toast, useToast } from "@/components/ui/toast";

interface AcademicYear {
  id: string;
  year: string;
  startDate: string | Date;
  endDate: string | Date;
  isActive: boolean;
  _count: { students: number };
}

interface Student {
  id: string;
  class: string;
  section: string;
  user: { name: string };
  academicYear: { year: string };
}

const CLASSES = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];
const SECTIONS = ["A", "B", "C", "D", "E", "F"];

export function AcademicYearsManager({
  years,
  students,
}: {
  years: AcademicYear[];
  students: Student[];
}) {
  const router = useRouter();
  const { toast, showToast, hideToast } = useToast();
  const [newYear, setNewYear] = useState({ year: "", startDate: "", endDate: "" });
  const [adding, setAdding] = useState(false);
  const [promoteTargetId, setPromoteTargetId] = useState("");
  const [promoting, setPromoting] = useState(false);
  const [promotions, setPromotions] = useState<Record<string, { newClass: string; newSection: string }>>({});

  async function handleAddYear() {
    if (!newYear.year || !newYear.startDate || !newYear.endDate) {
      showToast("All fields required", "error");
      return;
    }
    setAdding(true);
    const res = await fetch("/api/academic-years", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newYear),
    });
    setAdding(false);
    if (res.ok) {
      showToast("Academic year created", "success");
      setNewYear({ year: "", startDate: "", endDate: "" });
      router.refresh();
    } else {
      const d = await res.json();
      showToast(d.error || "Failed", "error");
    }
  }

  async function handleActivate(id: string) {
    const res = await fetch(`/api/academic-years/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: true }),
    });
    if (res.ok) {
      showToast("Academic year activated", "success");
      router.refresh();
    }
  }

  function updatePromotion(studentId: string, field: string, value: string) {
    setPromotions((p) => ({
      ...p,
      [studentId]: { ...p[studentId], [field]: value },
    }));
  }

  function autoPromoteAll() {
    const updates: Record<string, { newClass: string; newSection: string }> = {};
    students.forEach((s) => {
      const nextClass = String(Math.min(parseInt(s.class) + 1, 12));
      updates[s.id] = { newClass: nextClass, newSection: s.section };
    });
    setPromotions(updates);
  }

  async function handlePromote() {
    if (!promoteTargetId) {
      showToast("Select target academic year", "error");
      return;
    }
    const promoList = Object.entries(promotions)
      .filter(([, v]) => v.newClass && v.newSection)
      .map(([studentId, v]) => ({ studentId, newClass: v.newClass, newSection: v.newSection }));

    if (!promoList.length) {
      showToast("No students selected for promotion", "error");
      return;
    }

    setPromoting(true);
    const res = await fetch(`/api/academic-years/${promoteTargetId}/promote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ promotions: promoList }),
    });
    setPromoting(false);
    if (res.ok) {
      const d = await res.json();
      showToast(`${d.promoted} student(s) promoted`, "success");
      setPromotions({});
      router.refresh();
    } else {
      showToast("Promotion failed", "error");
    }
  }

  return (
    <>
      <div className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Create Academic Year</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="space-y-1">
              <Label className="text-xs">Year (e.g. 2025-2026)</Label>
              <Input value={newYear.year} onChange={(e) => setNewYear((p) => ({ ...p, year: e.target.value }))} placeholder="2025-2026" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Start Date</Label>
              <Input type="date" value={newYear.startDate} onChange={(e) => setNewYear((p) => ({ ...p, startDate: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">End Date</Label>
              <Input type="date" value={newYear.endDate} onChange={(e) => setNewYear((p) => ({ ...p, endDate: e.target.value }))} />
            </div>
            <div className="flex items-end">
              <Button onClick={handleAddYear} disabled={adding} className="w-full">
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>All Academic Years</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Year</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>End</TableHead>
                  <TableHead className="text-center">Students</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {years.map((y) => (
                  <TableRow key={y.id}>
                    <TableCell className="font-medium">{y.year}</TableCell>
                    <TableCell className="text-sm">{new Date(y.startDate).toLocaleDateString()}</TableCell>
                    <TableCell className="text-sm">{new Date(y.endDate).toLocaleDateString()}</TableCell>
                    <TableCell className="text-center">{y._count.students}</TableCell>
                    <TableCell>
                      {y.isActive ? (
                        <Badge variant="success">Active</Badge>
                      ) : (
                        <Badge variant="outline">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {!y.isActive && (
                        <Button variant="outline" size="sm" onClick={() => handleActivate(y.id)}>
                          <CheckCircle className="h-3 w-3 mr-1" /> Activate
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Student Promotion</CardTitle>
            <p className="text-sm text-muted-foreground">
              Move students to a new academic year and update their class.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-end gap-3">
              <div className="space-y-1 flex-1">
                <Label className="text-xs">Promote to Academic Year</Label>
                <Select value={promoteTargetId} onValueChange={setPromoteTargetId}>
                  <SelectTrigger><SelectValue placeholder="Select target year" /></SelectTrigger>
                  <SelectContent>
                    {years.map((y) => (
                      <SelectItem key={y.id} value={y.id}>{y.year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" onClick={autoPromoteAll} disabled={!students.length}>
                Auto-fill (+1 Class)
              </Button>
              <Button onClick={handlePromote} disabled={promoting || !promoteTargetId}>
                {promoting ? "Promoting..." : "Promote Selected"}
              </Button>
            </div>

            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Current Class</TableHead>
                    <TableHead>Current Year</TableHead>
                    <TableHead>New Class</TableHead>
                    <TableHead>New Section</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.user.name}</TableCell>
                      <TableCell>{s.class}-{s.section}</TableCell>
                      <TableCell className="text-muted-foreground">{s.academicYear.year}</TableCell>
                      <TableCell>
                        <Select
                          value={promotions[s.id]?.newClass || ""}
                          onValueChange={(v) => updatePromotion(s.id, "newClass", v)}
                        >
                          <SelectTrigger className="h-8 w-24">
                            <SelectValue placeholder="—" />
                          </SelectTrigger>
                          <SelectContent>
                            {CLASSES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={promotions[s.id]?.newSection || ""}
                          onValueChange={(v) => updatePromotion(s.id, "newSection", v)}
                        >
                          <SelectTrigger className="h-8 w-24">
                            <SelectValue placeholder="—" />
                          </SelectTrigger>
                          <SelectContent>
                            {SECTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
    </>
  );
}
