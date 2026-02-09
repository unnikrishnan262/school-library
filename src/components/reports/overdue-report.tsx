"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PrintButton } from "./print-button";
import { formatDate } from "@/lib/utils";

interface OverdueItem {
  id: string;
  bookTitle: string;
  accessionNumber: string;
  memberName: string;
  memberType: string;
  class?: string;
  issueDate: string;
  dueDate: string;
  daysOverdue: number;
  estimatedFine: number;
}

interface OverdueData {
  rows: OverdueItem[];
  totalPendingFines: number;
}

export function OverdueReport({ schoolName }: { schoolName: string }) {
  const [data, setData] = useState<OverdueData | null>(null);
  const [loading, setLoading] = useState(false);

  async function fetchData() {
    setLoading(true);
    const res = await fetch("/api/reports/overdue");
    if (res.ok) setData(await res.json());
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 print:hidden">
        <Button onClick={fetchData} disabled={loading}>
          {loading ? "Loading..." : "Refresh"}
        </Button>
        {data && <PrintButton />}
      </div>

      {data && (
        <>
          <div className="text-center mb-4 hidden print:block">
            <h2 className="text-xl font-bold">{schoolName}</h2>
            <h3 className="text-lg">Overdue Books Report</h3>
            <p className="text-sm">Generated: {new Date().toLocaleDateString("en-IN")}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-destructive">{data.rows.length}</p>
                <p className="text-xs text-muted-foreground">Overdue Books</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-destructive">₹{data.totalPendingFines.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">Pending Fines</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Overdue Items</CardTitle>
            </CardHeader>
            <CardContent>
              {data.rows.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No overdue books</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Book</TableHead>
                      <TableHead>Accession No.</TableHead>
                      <TableHead>Member</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead className="text-center">Issue Date</TableHead>
                      <TableHead className="text-center">Due Date</TableHead>
                      <TableHead className="text-center">Days Overdue</TableHead>
                      <TableHead className="text-right">Est. Fine</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.rows.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium max-w-[180px] truncate">{item.bookTitle}</TableCell>
                        <TableCell className="font-mono text-sm">{item.accessionNumber}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {item.memberName}
                            <Badge variant={item.memberType === "student" ? "secondary" : "outline"} className="text-xs">
                              {item.memberType.toUpperCase()}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{item.class || "—"}</TableCell>
                        <TableCell className="text-center text-sm">{formatDate(item.issueDate)}</TableCell>
                        <TableCell className="text-center text-sm text-destructive font-medium">{formatDate(item.dueDate)}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="destructive">{item.daysOverdue}d</Badge>
                        </TableCell>
                        <TableCell className="text-right text-destructive font-medium">
                          ₹{item.estimatedFine.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
