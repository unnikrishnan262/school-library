"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PrintButton } from "./print-button";

interface SummaryRow { period: string; issued: number; returned: number }
interface SummaryData {
  rows: SummaryRow[];
  totals: { issued: number; returned: number; finesCollected: number };
}

export function SummaryReport({ schoolName }: { schoolName: string }) {
  const today = new Date().toISOString().split("T")[0];
  const monthStart = new Date(new Date().setDate(1)).toISOString().split("T")[0];

  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today);
  const [groupBy, setGroupBy] = useState("day");
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(false);

  async function fetchData() {
    setLoading(true);
    const res = await fetch(`/api/reports/summary?from=${from}&to=${to}&groupBy=${groupBy}`);
    if (res.ok) setData(await res.json());
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const periodLabel: Record<string, string> = { day: "Date", month: "Month", year: "Year" };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap print:hidden">
        <div className="space-y-1">
          <Label className="text-xs">From</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">To</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Group By</Label>
          <Select value={groupBy} onValueChange={setGroupBy}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Day</SelectItem>
              <SelectItem value="month">Month</SelectItem>
              <SelectItem value="year">Year</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end gap-2">
          <Button onClick={fetchData} disabled={loading}>
            {loading ? "Loading..." : "Generate"}
          </Button>
          {data && <PrintButton />}
        </div>
      </div>

      {data && (
        <>
          <div className="print:block">
            <div className="text-center mb-4 hidden print:block">
              <h2 className="text-xl font-bold">{schoolName}</h2>
              <h3 className="text-lg">Issue / Return Summary Report</h3>
              <p className="text-sm">Period: {from} to {to}</p>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold">{data.totals.issued}</p>
                  <p className="text-xs text-muted-foreground">Total Issued</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold">{data.totals.returned}</p>
                  <p className="text-xs text-muted-foreground">Total Returned</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold">₹{data.totals.finesCollected.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">Fines Collected</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Detailed Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                {data.rows.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No data for this period</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{periodLabel[groupBy] || "Period"}</TableHead>
                        <TableHead className="text-center">Books Issued</TableHead>
                        <TableHead className="text-center">Books Returned</TableHead>
                        <TableHead className="text-center">Net</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.rows.map((row) => (
                        <TableRow key={row.period}>
                          <TableCell className="font-mono">{row.period}</TableCell>
                          <TableCell className="text-center">{row.issued}</TableCell>
                          <TableCell className="text-center">{row.returned}</TableCell>
                          <TableCell className={`text-center font-medium ${row.issued - row.returned > 0 ? "text-destructive" : "text-green-600"}`}>
                            {row.issued - row.returned > 0 ? `+${row.issued - row.returned}` : row.issued - row.returned}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="font-bold bg-muted/50">
                        <TableCell>Total</TableCell>
                        <TableCell className="text-center">{data.totals.issued}</TableCell>
                        <TableCell className="text-center">{data.totals.returned}</TableCell>
                        <TableCell className="text-center">{data.totals.issued - data.totals.returned}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
