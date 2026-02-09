"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast, Toast } from "@/components/ui/toast";

interface Settings {
  fine_per_day: { value: string; description: string };
  grace_period_days: { value: string; description: string };
  max_fine_per_book: { value: string; description: string };
  max_borrow_days_student: { value: string; description: string };
  max_borrow_days_teacher: { value: string; description: string };
  max_books_student: { value: string; description: string };
  max_books_teacher: { value: string; description: string };
  max_renewals: { value: string; description: string };
  reservation_expiry_days: { value: string; description: string };
  school_name: { value: string; description: string };
}

export function SettingsForm() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast, showToast, hideToast } = useToast();

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    const res = await fetch("/api/settings");
    if (res.ok) {
      setSettings(await res.json());
    }
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);

    const formData = new FormData(e.currentTarget);
    const updates: Record<string, string> = {};
    formData.forEach((value, key) => {
      updates[key] = value.toString();
    });

    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });

    if (res.ok) {
      showToast("Settings saved successfully", "success");
      fetchSettings();
    } else {
      const data = await res.json();
      showToast(`Error saving settings: ${data.error}`, "error");
    }

    setSaving(false);
  }

  if (loading) return <div className="p-4">Loading settings...</div>;
  if (!settings) return <div className="p-4">Failed to load settings</div>;

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
      <form onSubmit={handleSubmit} className="space-y-6">
      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
          <CardDescription>School information and display settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="school_name">School Name</Label>
            <Input
              id="school_name"
              name="school_name"
              defaultValue={settings.school_name.value}
              required
            />
            <p className="text-xs text-muted-foreground">{settings.school_name.description}</p>
          </div>
        </CardContent>
      </Card>

      {/* Fine Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Fine Configuration</CardTitle>
          <CardDescription>Configure overdue book fine calculation</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="fine_per_day">Fine Per Day (₹)</Label>
            <Input
              id="fine_per_day"
              name="fine_per_day"
              type="number"
              step="0.01"
              min="0"
              defaultValue={settings.fine_per_day.value}
              required
            />
            <p className="text-xs text-muted-foreground">{settings.fine_per_day.description}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="grace_period_days">Grace Period (Days)</Label>
            <Input
              id="grace_period_days"
              name="grace_period_days"
              type="number"
              min="0"
              defaultValue={settings.grace_period_days.value}
              required
            />
            <p className="text-xs text-muted-foreground">{settings.grace_period_days.description}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="max_fine_per_book">Max Fine Per Book (₹)</Label>
            <Input
              id="max_fine_per_book"
              name="max_fine_per_book"
              type="number"
              step="0.01"
              min="0"
              defaultValue={settings.max_fine_per_book.value}
              required
            />
            <p className="text-xs text-muted-foreground">{settings.max_fine_per_book.description}</p>
          </div>
        </CardContent>
      </Card>

      {/* Borrowing Rules */}
      <Card>
        <CardHeader>
          <CardTitle>Borrowing Rules</CardTitle>
          <CardDescription>Set limits for students and teachers</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="max_borrow_days_student">Student Borrow Duration (Days)</Label>
            <Input
              id="max_borrow_days_student"
              name="max_borrow_days_student"
              type="number"
              min="1"
              defaultValue={settings.max_borrow_days_student.value}
              required
            />
            <p className="text-xs text-muted-foreground">{settings.max_borrow_days_student.description}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="max_borrow_days_teacher">Teacher Borrow Duration (Days)</Label>
            <Input
              id="max_borrow_days_teacher"
              name="max_borrow_days_teacher"
              type="number"
              min="1"
              defaultValue={settings.max_borrow_days_teacher.value}
              required
            />
            <p className="text-xs text-muted-foreground">{settings.max_borrow_days_teacher.description}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="max_books_student">Max Books (Student)</Label>
            <Input
              id="max_books_student"
              name="max_books_student"
              type="number"
              min="1"
              defaultValue={settings.max_books_student.value}
              required
            />
            <p className="text-xs text-muted-foreground">{settings.max_books_student.description}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="max_books_teacher">Max Books (Teacher)</Label>
            <Input
              id="max_books_teacher"
              name="max_books_teacher"
              type="number"
              min="1"
              defaultValue={settings.max_books_teacher.value}
              required
            />
            <p className="text-xs text-muted-foreground">{settings.max_books_teacher.description}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="max_renewals">Max Renewals</Label>
            <Input
              id="max_renewals"
              name="max_renewals"
              type="number"
              min="0"
              defaultValue={settings.max_renewals.value}
              required
            />
            <p className="text-xs text-muted-foreground">{settings.max_renewals.description}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reservation_expiry_days">Reservation Expiry (Days)</Label>
            <Input
              id="reservation_expiry_days"
              name="reservation_expiry_days"
              type="number"
              min="1"
              defaultValue={settings.reservation_expiry_days.value}
              required
            />
            <p className="text-xs text-muted-foreground">{settings.reservation_expiry_days.description}</p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </form>
    </>
  );
}
