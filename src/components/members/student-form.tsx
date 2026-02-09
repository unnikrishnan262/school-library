"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Toast, useToast } from "@/components/ui/toast";

interface AcademicYear {
  id: string;
  year: string;
  isActive: boolean;
}

interface StudentFormProps {
  academicYears: AcademicYear[];
  initialData?: {
    id?: string;
    userId?: string;
    name?: string;
    email?: string;
    admissionNumber?: string;
    class?: string;
    section?: string;
    academicYearId?: string;
    parentPhone?: string;
    address?: string;
    isActive?: boolean;
  };
  mode: "create" | "edit";
}

const CLASSES = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];
const SECTIONS = ["A", "B", "C", "D", "E", "F"];

export function StudentForm({ academicYears, initialData, mode }: StudentFormProps) {
  const router = useRouter();
  const { toast, showToast, hideToast } = useToast();
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: initialData?.name || "",
    email: initialData?.email || "",
    password: "",
    admissionNumber: initialData?.admissionNumber || "",
    class: initialData?.class || "",
    section: initialData?.section || "",
    academicYearId: initialData?.academicYearId || (academicYears.find((y) => y.isActive)?.id || ""),
    parentPhone: initialData?.parentPhone || "",
    address: initialData?.address || "",
    isActive: initialData?.isActive ?? true,
  });

  function update(field: string, value: string | boolean) {
    setForm((p) => ({ ...p, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const url = mode === "create" ? "/api/members/students" : `/api/members/students/${initialData?.id}`;
    const method = mode === "create" ? "POST" : "PUT";
    const payload = mode === "create" ? form : { ...form, password: undefined };

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setLoading(false);
    if (res.ok) {
      showToast(mode === "create" ? "Student added" : "Student updated", "success");
      setTimeout(() => router.push("/members"), 800);
    } else {
      const data = await res.json();
      showToast(data.error || "Failed", "error");
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Account</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input id="name" value={form.name} onChange={(e) => update("name", e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input id="email" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} required disabled={mode === "edit"} />
            </div>
            {mode === "create" && (
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={form.password} onChange={(e) => update("password", e.target.value)} placeholder="Default: student123" />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Student Details</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="admissionNumber">Admission Number *</Label>
              <Input id="admissionNumber" value={form.admissionNumber} onChange={(e) => update("admissionNumber", e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Academic Year *</Label>
              <Select value={form.academicYearId} onValueChange={(v) => update("academicYearId", v)}>
                <SelectTrigger><SelectValue placeholder="Select year" /></SelectTrigger>
                <SelectContent>
                  {academicYears.map((y) => (
                    <SelectItem key={y.id} value={y.id}>{y.year}{y.isActive ? " (Active)" : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Class *</Label>
              <Select value={form.class} onValueChange={(v) => update("class", v)}>
                <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>
                  {CLASSES.map((c) => <SelectItem key={c} value={c}>Class {c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Section *</Label>
              <Select value={form.section} onValueChange={(v) => update("section", v)}>
                <SelectTrigger><SelectValue placeholder="Select section" /></SelectTrigger>
                <SelectContent>
                  {SECTIONS.map((s) => <SelectItem key={s} value={s}>Section {s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="parentPhone">Parent Phone</Label>
              <Input id="parentPhone" value={form.parentPhone} onChange={(e) => update("parentPhone", e.target.value)} placeholder="+91 ..." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" value={form.address} onChange={(e) => update("address", e.target.value)} />
            </div>
            {mode === "edit" && (
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.isActive ? "active" : "inactive"} onValueChange={(v) => update("isActive", v === "active")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={loading}>
            {loading ? "Saving..." : mode === "create" ? "Add Student" : "Save Changes"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        </div>
      </form>
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
    </>
  );
}
