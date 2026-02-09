import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/api-helpers";

export async function GET(request: Request) {
  const auth = await requireAuth(["ADMIN", "LIBRARIAN"]);
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const groupBy = searchParams.get("groupBy") || "day"; // day | month | year

  const fromDate = from ? new Date(from) : new Date(new Date().setDate(1)); // default: start of month
  const toDate = to ? new Date(to) : new Date();
  toDate.setHours(23, 59, 59, 999);

  const [issued, returned, finesCollected] = await Promise.all([
    prisma.transaction.findMany({
      where: { issueDate: { gte: fromDate, lte: toDate } },
      select: { issueDate: true },
      orderBy: { issueDate: "asc" },
    }),
    prisma.transaction.findMany({
      where: { returnDate: { gte: fromDate, lte: toDate } },
      select: { returnDate: true },
      orderBy: { returnDate: "asc" },
    }),
    prisma.fine.aggregate({
      where: { isPaid: true, paidAt: { gte: fromDate, lte: toDate } },
      _sum: { amount: true },
    }),
  ]);

  // Group by day/month/year
  function getKey(date: Date): string {
    if (groupBy === "year") return date.getFullYear().toString();
    if (groupBy === "month") return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    return date.toISOString().split("T")[0];
  }

  const issueMap: Record<string, number> = {};
  const returnMap: Record<string, number> = {};

  issued.forEach((t) => {
    const k = getKey(t.issueDate);
    issueMap[k] = (issueMap[k] || 0) + 1;
  });
  returned.forEach((t) => {
    if (!t.returnDate) return;
    const k = getKey(t.returnDate);
    returnMap[k] = (returnMap[k] || 0) + 1;
  });

  const allKeys = [...new Set([...Object.keys(issueMap), ...Object.keys(returnMap)])].sort();
  const rows = allKeys.map((k) => ({
    period: k,
    issued: issueMap[k] || 0,
    returned: returnMap[k] || 0,
  }));

  return NextResponse.json({
    rows,
    totals: {
      issued: issued.length,
      returned: returned.length,
      finesCollected: Number(finesCollected._sum.amount || 0),
    },
  });
}
