import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { requireAuth } from "@/lib/api-helpers";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  const auth = await requireAuth(["ADMIN"]);
  if (auth.error) return auth.error;

  const { filename } = await params;

  // Validate filename to prevent directory traversal
  if (!filename || filename.includes("..") || filename.includes("/") || !filename.endsWith(".sql")) {
    return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
  }

  try {
    const filepath = path.join(process.cwd(), "backups", filename);
    const content = await readFile(filepath);

    return new NextResponse(content, {
      headers: {
        "Content-Type": "application/sql",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Download backup error:", error);
    return NextResponse.json(
      { error: "Backup file not found" },
      { status: 404 }
    );
  }
}
