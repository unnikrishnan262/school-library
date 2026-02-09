import { NextResponse } from "next/server";
import { readdir, stat } from "fs/promises";
import path from "path";
import { requireAuth } from "@/lib/api-helpers";

export async function GET(request: Request) {
  const auth = await requireAuth(["ADMIN"]);
  if (auth.error) return auth.error;

  try {
    const backupsDir = path.join(process.cwd(), "backups");

    // Try to read directory, return empty array if it doesn't exist
    let files: string[];
    try {
      files = await readdir(backupsDir);
    } catch {
      return NextResponse.json({ backups: [] });
    }

    // Filter for .sql files and get their stats
    const backups = await Promise.all(
      files
        .filter((f) => f.endsWith(".sql"))
        .map(async (filename) => {
          const filepath = path.join(backupsDir, filename);
          const stats = await stat(filepath);
          return {
            filename,
            size: stats.size,
            created: stats.birthtime,
            modified: stats.mtime,
          };
        })
    );

    // Sort by creation date, newest first
    backups.sort((a, b) => b.created.getTime() - a.created.getTime());

    return NextResponse.json({ backups });
  } catch (error) {
    console.error("List backups error:", error);
    return NextResponse.json(
      { error: "Failed to list backups", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
