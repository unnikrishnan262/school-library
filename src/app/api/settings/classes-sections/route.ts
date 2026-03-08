import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/api-helpers";
import { logAudit } from "@/lib/audit-logger";

const DEFAULT_CLASSES = ["1","2","3","4","5","6","7","8","9","10","11","12"];
const DEFAULT_SECTIONS = ["A","B","C","D","E","F"];

export async function GET() {
  const auth = await requireAuth(["ADMIN", "LIBRARIAN"]);
  if (auth.error) return auth.error;

  const [classesRow, sectionsRow] = await Promise.all([
    prisma.settings.findUnique({ where: { key: "classes" } }),
    prisma.settings.findUnique({ where: { key: "sections" } }),
  ]);

  return NextResponse.json({
    classes: classesRow ? JSON.parse(classesRow.value) : DEFAULT_CLASSES,
    sections: sectionsRow ? JSON.parse(sectionsRow.value) : DEFAULT_SECTIONS,
  });
}

export async function PUT(request: Request) {
  const auth = await requireAuth(["ADMIN"]);
  if (auth.error) return auth.error;

  const { classes, sections } = await request.json();

  if (!Array.isArray(classes) || !Array.isArray(sections)) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  const cleanClasses = [...new Set(classes.map((c: string) => String(c).trim()).filter(Boolean))];
  const cleanSections = [...new Set(sections.map((s: string) => String(s).trim().toUpperCase()).filter(Boolean))];

  if (cleanClasses.length === 0 || cleanSections.length === 0) {
    return NextResponse.json({ error: "Must have at least one class and one section" }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.settings.upsert({
      where: { key: "classes" },
      update: { value: JSON.stringify(cleanClasses) },
      create: { key: "classes", value: JSON.stringify(cleanClasses), description: "Available class options" },
    }),
    prisma.settings.upsert({
      where: { key: "sections" },
      update: { value: JSON.stringify(cleanSections) },
      create: { key: "sections", value: JSON.stringify(cleanSections), description: "Available section options" },
    }),
  ]);

  await logAudit({
    userId: auth.session!.user.id,
    action: "UPDATE",
    entity: "settings",
    entityId: "classes-sections",
    details: { classes: cleanClasses, sections: cleanSections },
  });

  return NextResponse.json({ classes: cleanClasses, sections: cleanSections });
}
