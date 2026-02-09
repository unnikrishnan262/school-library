import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/api-helpers";

export async function GET(request: Request) {
  const auth = await requireAuth(["ADMIN", "LIBRARIAN"]);
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const academicYearId = searchParams.get("academicYearId") || "";
  const classFilter = searchParams.get("class") || "";

  const where = {
    AND: [
      search
        ? {
            OR: [
              { user: { name: { contains: search, mode: "insensitive" as const } } },
              { admissionNumber: { contains: search, mode: "insensitive" as const } },
              { user: { email: { contains: search, mode: "insensitive" as const } } },
            ],
          }
        : {},
      academicYearId ? { academicYearId } : {},
      classFilter ? { class: classFilter } : {},
    ],
  };

  const students = await prisma.student.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, email: true, isActive: true } },
      academicYear: { select: { id: true, year: true } },
      _count: { select: { transactions: true } },
    },
    orderBy: [{ class: "asc" }, { section: "asc" }, { user: { name: "asc" } }],
  });

  return NextResponse.json(students);
}

export async function POST(request: Request) {
  const auth = await requireAuth(["ADMIN", "LIBRARIAN"]);
  if (auth.error) return auth.error;

  const {
    name, email, password, admissionNumber,
    class: cls, section, academicYearId, parentPhone, address,
  } = await request.json();

  if (!name?.trim() || !email?.trim() || !admissionNumber?.trim() || !cls || !section || !academicYearId) {
    return NextResponse.json({ error: "Required fields missing" }, { status: 400 });
  }

  const hashedPassword = await bcrypt.hash(password || "student123", 12);

  try {
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: hashedPassword,
        role: "STUDENT",
        student: {
          create: {
            admissionNumber: admissionNumber.trim(),
            class: cls,
            section: section.trim().toUpperCase(),
            academicYearId,
            parentPhone: parentPhone?.trim() || null,
            address: address?.trim() || null,
          },
        },
      },
      include: { student: { include: { academicYear: true } } },
    });
    return NextResponse.json(user, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Email or admission number already exists" },
      { status: 409 }
    );
  }
}
