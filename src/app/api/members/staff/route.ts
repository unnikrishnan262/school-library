import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/api-helpers";

export async function GET(request: Request) {
  const auth = await requireAuth(["ADMIN", "LIBRARIAN"]);
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";

  const staff = await prisma.staff.findMany({
    where: search
      ? {
          OR: [
            { user: { name: { contains: search, mode: "insensitive" } } },
            { staffId: { contains: search, mode: "insensitive" } },
            { department: { contains: search, mode: "insensitive" } },
          ],
        }
      : undefined,
    include: {
      user: { select: { id: true, name: true, email: true, role: true, isActive: true } },
      _count: { select: { transactions: true } },
    },
    orderBy: { user: { name: "asc" } },
  });

  return NextResponse.json(staff);
}

export async function POST(request: Request) {
  const auth = await requireAuth(["ADMIN", "LIBRARIAN"]);
  if (auth.error) return auth.error;

  const { name, email, password, staffId, department, role } = await request.json();

  if (!name?.trim() || !email?.trim() || !staffId?.trim()) {
    return NextResponse.json({ error: "Name, email and staff ID are required" }, { status: 400 });
  }

  const hashedPassword = await bcrypt.hash(password || "staff123", 12);

  try {
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: hashedPassword,
        role: role || "TEACHER",
        staff: {
          create: {
            staffId: staffId.trim(),
            department: department?.trim() || null,
          },
        },
      },
      include: { staff: true },
    });
    return NextResponse.json(user, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Email or staff ID already exists" },
      { status: 409 }
    );
  }
}
