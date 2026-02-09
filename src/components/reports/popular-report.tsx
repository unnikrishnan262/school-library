"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PrintButton } from "./print-button";

interface PopularBook {
  id: string;
  title: string;
  author: string;
  category: string;
  type: string;
  totalCopies: number;
  availableCopies: number;
  issueCount: number;
}

export function PopularReport({ schoolName }: { schoolName: string }) {
  const today = new Date().toISOString().split("T")[0];
  const yearAgo = new Date(new Date().setFullYear(new Date().getFullYear() - 1))
    .toISOString()
    .split("T")[0];

  const [from, setFrom] = useState(yearAgo);
  const [to, setTo] = useState(today);
  const [limit, setLimit] = useState("20");
  const [data, setData] = useState<PopularBook[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function fetchData() {
    setLoading(true);
    const res = await fetch(`/api/reports/popular?from=${from}&to=${to}&limit=${limit}`);
    if (res.ok) setData(await res.json());
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
          <Label className="text-xs">Top N</Label>
          <Input type="number" value={limit} onChange={(e) => setLimit(e.target.value)} className="w-24" min="5" max="100" />
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
          <div className="text-center mb-4 hidden print:block">
            <h2 className="text-xl font-bold">{schoolName}</h2>
            <h3 className="text-lg">Most Issued Books Report</h3>
            <p className="text-sm">Period: {from} to {to}</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Top {data.length} Most Issued Books</CardTitle>
            </CardHeader>
            <CardContent>
              {data.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No data for this period</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Author</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-center">Copies</TableHead>
                      <TableHead className="text-center">Available</TableHead>
                      <TableHead className="text-center">Times Issued</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.map((book, index) => (
                      <TableRow key={book.id}>
                        <TableCell className="font-bold text-muted-foreground">{index + 1}</TableCell>
                        <TableCell className="font-medium max-w-[180px] truncate">{book.title}</TableCell>
                        <TableCell className="text-sm">{book.author}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{book.category}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">{book.type}</TableCell>
                        <TableCell className="text-center">{book.totalCopies}</TableCell>
                        <TableCell className="text-center">
                          <span className={book.availableCopies === 0 ? "text-destructive font-medium" : "text-green-600"}>
                            {book.availableCopies}
                          </span>
                        </TableCell>
                        <TableCell className="text-center font-bold">{book.issueCount}</TableCell>
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
