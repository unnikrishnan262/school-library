import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/api-helpers";
import { logAudit } from "@/lib/audit-logger";

export async function GET(request: Request) {
  const auth = await requireAuth(["ADMIN"]);
  if (auth.error) return auth.error;

  const settings = await prisma.settings.findMany({
    orderBy: { key: "asc" },
  });

  // Convert to key-value map for easier UI consumption
  const settingsMap = settings.reduce((acc, s) => {
    acc[s.key] = { value: s.value, description: s.description || "" };
    return acc;
  }, {} as Record<string, { value: string; description: string }>);

  return NextResponse.json(settingsMap);
}

export async function PUT(request: Request) {
  const auth = await requireAuth(["ADMIN"]);
  if (auth.error) return auth.error;

  const updates: Record<string, string> = await request.json();

  // Validate numeric settings
  const numericKeys = [
    "fine_per_day", "grace_period_days", "max_fine_per_book",
    "max_borrow_days_student", "max_borrow_days_teacher",
    "max_books_student", "max_books_teacher", "max_renewals", "reservation_expiry_days"
  ];

  for (const key of numericKeys) {
    if (updates[key] !== undefined) {
      const val = parseFloat(updates[key]);
      if (isNaN(val) || val < 0) {
        return NextResponse.json(
          { error: `${key} must be a non-negative number` },
          { status: 400 }
        );
      }
    }
  }

  // Update settings in transaction
  await prisma.$transaction(
    Object.entries(updates).map(([key, value]) =>
      prisma.settings.upsert({
        where: { key },
        update: { value },
        create: { key, value, description: "" },
      })
    )
  );

  await logAudit({
    userId: auth.session!.user.id,
    action: "UPDATE",
    entity: "settings",
    entityId: "system",
    details: updates,
  });

  return NextResponse.json({ success: true });
}
