import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import { requireAuth } from "@/lib/api-helpers";
import { logAudit } from "@/lib/audit-logger";

const execAsync = promisify(exec);

export async function POST(request: Request) {
  const auth = await requireAuth(["ADMIN"]);
  if (auth.error) return auth.error;

  try {
    const { filename } = await request.json();

    // Validate filename
    if (!filename || filename.includes("..") || filename.includes("/") || !filename.endsWith(".sql")) {
      return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
    }

    const filepath = path.join(process.cwd(), "backups", filename);

    // Get database connection details
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      return NextResponse.json({ error: "DATABASE_URL not configured" }, { status: 500 });
    }

    // Parse database URL
    const url = new URL(dbUrl);
    const host = url.hostname;
    const port = url.port || "5432";
    const database = url.pathname.slice(1);
    const username = url.username;
    const password = url.password;

    // WARNING: This drops and recreates the database
    // Run psql to restore
    const command = `PGPASSWORD="${password}" psql -h ${host} -p ${port} -U ${username} -d ${database} -f "${filepath}"`;

    await execAsync(command);

    await logAudit({
      userId: auth.session!.user.id,
      action: "UPDATE",
      entity: "backup",
      entityId: filename,
      details: { action: "restore", filename, filepath },
    });

    return NextResponse.json({
      success: true,
      message: "Database restored successfully"
    });
  } catch (error) {
    console.error("Restore error:", error);
    return NextResponse.json(
      { error: "Failed to restore backup", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
