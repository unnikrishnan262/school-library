"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime } from "@/lib/utils";

interface AuditLog {
  id: string;
  userId: string;
  action: string;
  entity: string;
  entityId: string;
  details: unknown;
  createdAt: string;
  user: {
    name: string;
    email: string;
    role: string;
  };
}

interface AuditLogsResponse {
  logs: AuditLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export function AuditLogViewer() {
  const [data, setData] = useState<AuditLogsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [action, setAction] = useState("");
  const [entity, setEntity] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchLogs();
  }, [page, action, entity]); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchLogs() {
    setLoading(true);
    const params = new URLSearchParams({
      page: page.toString(),
      ...(action && { action }),
      ...(entity && { entity }),
      ...(search && { userId: search }),
    });
    const res = await fetch(`/api/audit-logs?${params}`);
    if (res.ok) setData(await res.json());
    setLoading(false);
  }

  function handleSearch() {
    setPage(1);
    fetchLogs();
  }

  const actionColor: Record<string, string> = {
    CREATE: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    UPDATE: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    DELETE: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    LOGIN: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-3 flex-wrap">
          <Select value={action} onValueChange={(v) => { setAction(v); setPage(1); }}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All actions</SelectItem>
              <SelectItem value="CREATE">CREATE</SelectItem>
              <SelectItem value="UPDATE">UPDATE</SelectItem>
              <SelectItem value="DELETE">DELETE</SelectItem>
              <SelectItem value="LOGIN">LOGIN</SelectItem>
            </SelectContent>
          </Select>

          <Select value={entity} onValueChange={(v) => { setEntity(v); setPage(1); }}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All entities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All entities</SelectItem>
              <SelectItem value="book">Book</SelectItem>
              <SelectItem value="student">Student</SelectItem>
              <SelectItem value="staff">Staff</SelectItem>
              <SelectItem value="transaction">Transaction</SelectItem>
              <SelectItem value="settings">Settings</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex gap-2">
            <Input
              placeholder="Search user ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-60"
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <Button onClick={handleSearch} disabled={loading}>
              {loading ? "Loading..." : "Search"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {data && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Audit Logs ({data.pagination.total} total)</CardTitle>
            </CardHeader>
            <CardContent>
              {data.logs.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No audit logs found</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Entity</TableHead>
                        <TableHead>Entity ID</TableHead>
                        <TableHead>Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.logs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-xs font-mono whitespace-nowrap">
                            {formatDateTime(log.createdAt)}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="text-sm font-medium">{log.user.name}</span>
                              <span className="text-xs text-muted-foreground">{log.user.email}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={actionColor[log.action] || ""}>{log.action}</Badge>
                          </TableCell>
                          <TableCell className="text-sm">{log.entity}</TableCell>
                          <TableCell className="text-xs font-mono text-muted-foreground max-w-[120px] truncate">
                            {log.entityId}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[200px]">
                            <details className="cursor-pointer">
                              <summary>View</summary>
                              <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto max-h-40">
                                {JSON.stringify(log.details, null, 2)}
                              </pre>
                            </details>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              {page > 1 && (
                <Button variant="outline" size="sm" onClick={() => setPage(page - 1)}>
                  Previous
                </Button>
              )}
              <span className="text-sm text-muted-foreground">
                Page {page} of {data.pagination.totalPages}
              </span>
              {page < data.pagination.totalPages && (
                <Button variant="outline" size="sm" onClick={() => setPage(page + 1)}>
                  Next
                </Button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
