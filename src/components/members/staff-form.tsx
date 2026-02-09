"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Toast, useToast } from "@/components/ui/toast";

interface StaffFormProps {
  initialData?: {
    id?: string;
    name?: string;
    email?: string;
    staffId?: string;
    department?: string;
    role?: string;
    isActive?: boolean;
  };
  mode: "create" | "edit";
}

export function StaffForm({ initialData, mode }: StaffFormProps) {
  const router = useRouter();
  const { toast, showToast, hideToast } = useToast();
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: initialData?.name || "",
    email: initialData?.email || "",
    password: "",
    staffId: initialData?.staffId || "",
    department: initialData?.department || "",
    role: initialData?.role || "TEACHER",
    isActive: initialData?.isActive ?? true,
  });

  function update(field: string, value: string | boolean) {
    setForm((p) => ({ ...p, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const url = mode === "create" ? "/api/members/staff" : `/api/members/staff/${initialData?.id}`;
    const method = mode === "create" ? "POST" : "PUT";
    const payload = mode === "create" ? form : { ...form, password: undefined };

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setLoading(false);
    if (res.ok) {
      showToast(mode === "create" ? "Staff member added" : "Updated", "success");
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
          <CardHeader><CardTitle>Staff Member Details</CardTitle></CardHeader>
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
                <Input id="password" type="password" value={form.password} onChange={(e) => update("password", e.target.value)} placeholder="Default: staff123" />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="staffId">Staff ID *</Label>
              <Input id="staffId" value={form.staffId} onChange={(e) => update("staffId", e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Input id="department" value={form.department} onChange={(e) => update("department", e.target.value)} placeholder="e.g. Science" />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={form.role} onValueChange={(v) => update("role", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="TEACHER">Teacher</SelectItem>
                  <SelectItem value="LIBRARIAN">Librarian</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                </SelectContent>
              </Select>
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
            {loading ? "Saving..." : mode === "create" ? "Add Staff" : "Save Changes"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        </div>
      </form>
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
    </>
  );
}
