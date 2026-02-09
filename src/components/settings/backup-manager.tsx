"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast, Toast } from "@/components/ui/toast";
import { Download, RefreshCw, Upload, AlertTriangle } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

interface Backup {
  filename: string;
  size: number;
  created: string;
  modified: string;
}

export function BackupManager() {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const { toast, showToast, hideToast } = useToast();

  useEffect(() => {
    fetchBackups();
  }, []);

  async function fetchBackups() {
    setLoading(true);
    const res = await fetch("/api/backup/list");
    if (res.ok) {
      const data = await res.json();
      setBackups(data.backups);
    }
    setLoading(false);
  }

  async function createBackup() {
    setCreating(true);
    const res = await fetch("/api/backup/create", { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      showToast(`Backup created: ${data.filename}`, "success");
      fetchBackups();
    } else {
      const data = await res.json();
      showToast(`Backup failed: ${data.error}`, "error");
    }
    setCreating(false);
  }

  async function restoreBackup(filename: string) {
    if (!confirm(`⚠️ WARNING: This will restore the database from "${filename}". All current data will be replaced. Continue?`)) {
      return;
    }

    setRestoring(filename);
    const res = await fetch("/api/backup/restore", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename }),
    });

    if (res.ok) {
      showToast("Database restored - page will reload", "success");
      setTimeout(() => window.location.reload(), 2000);
    } else {
      const data = await res.json();
      showToast(`Restore failed: ${data.error}`, "error");
    }
    setRestoring(null);
  }

  function downloadBackup(filename: string) {
    window.open(`/api/backup/download/${filename}`, "_blank");
  }

  function formatBytes(bytes: number): string {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  }

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
      <div className="space-y-6">
      <Card className="border-orange-200 bg-orange-50/50 dark:border-orange-900 dark:bg-orange-950/20">
        <CardContent className="flex items-start gap-3 p-4">
          <AlertTriangle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-orange-900 dark:text-orange-100">Backup & Restore Warning</p>
            <p className="text-orange-800 dark:text-orange-200 mt-1">
              Restoring a backup will replace <strong>all current data</strong> in the database.
              Always create a backup before restoring. Ensure PostgreSQL <code>pg_dump</code> and <code>psql</code> commands are available in your system PATH.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Database Backups</CardTitle>
              <CardDescription>Create and manage local database backups</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={fetchBackups} disabled={loading}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button onClick={createBackup} disabled={creating}>
                {creating ? "Creating..." : "Create Backup"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Loading backups...</p>
          ) : backups.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No backups found. Create your first backup above.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Filename</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {backups.map((backup) => (
                  <TableRow key={backup.filename}>
                    <TableCell className="font-mono text-sm">{backup.filename}</TableCell>
                    <TableCell className="text-sm">{formatDateTime(backup.created)}</TableCell>
                    <TableCell className="text-sm">{formatBytes(backup.size)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadBackup(backup.filename)}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => restoreBackup(backup.filename)}
                          disabled={restoring !== null}
                        >
                          <Upload className="h-4 w-4 mr-1" />
                          {restoring === backup.filename ? "Restoring..." : "Restore"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
    </>
  );
}
