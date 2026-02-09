import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { mkdir } from "fs/promises";
import path from "path";
import { requireAuth } from "@/lib/api-helpers";
import { logAudit } from "@/lib/audit-logger";

const execAsync = promisify(exec);

export async function POST(request: Request) {
  const auth = await requireAuth(["ADMIN"]);
  if (auth.error) return auth.error;

  try {
    // Create backups directory if it doesn't exist
    const backupsDir = path.join(process.cwd(), "backups");
    await mkdir(backupsDir, { recursive: true });

    // Generate backup filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").split("T").join("_").slice(0, -5);
    const filename = `backup_${timestamp}.sql`;
    const filepath = path.join(backupsDir, filename);

    // Get database connection details from environment
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

    // Run pg_dump
    const command = `PGPASSWORD="${password}" pg_dump -h ${host} -p ${port} -U ${username} -d ${database} -F p -f "${filepath}"`;

    await execAsync(command);

    await logAudit({
      userId: auth.session!.user.id,
      action: "CREATE",
      entity: "backup",
      entityId: filename,
      details: { filename, filepath },
    });

    return NextResponse.json({
      success: true,
      filename,
      message: "Backup created successfully"
    });
  } catch (error) {
    console.error("Backup error:", error);
    return NextResponse.json(
      { error: "Failed to create backup", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
