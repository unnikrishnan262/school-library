"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PrintButton } from "./print-button";

interface StockItem {
  id: string;
  title: string;
  author: string;
  category: string;
  type: string;
  totalCopies: number;
  available: number;
  issued: number;
  lost: number;
  damaged: number;
}

interface StockData {
  rows: StockItem[];
  summary: {
    totalBooks: number;
    totalCopies: number;
    available: number;
    issued: number;
    lost: number;
    damaged: number;
  };
}

export function StockReport({ schoolName }: { schoolName: string }) {
  const [data, setData] = useState<StockData | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  async function fetchData() {
    setLoading(true);
    const res = await fetch("/api/reports/stock");
    if (res.ok) setData(await res.json());
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = data?.rows.filter((item) =>
    !search ||
    item.title.toLowerCase().includes(search.toLowerCase()) ||
    item.author.toLowerCase().includes(search.toLowerCase()) ||
    item.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 print:hidden">
        <Input
          placeholder="Search title, author, category..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Button onClick={fetchData} disabled={loading}>
          {loading ? "Loading..." : "Refresh"}
        </Button>
        {data && <PrintButton />}
      </div>

      {data && (
        <>
          <div className="text-center mb-4 hidden print:block">
            <h2 className="text-xl font-bold">{schoolName}</h2>
            <h3 className="text-lg">Stock Verification Report</h3>
            <p className="text-sm">Generated: {new Date().toLocaleDateString("en-IN")}</p>
          </div>

          <div className="grid grid-cols-3 gap-4 md:grid-cols-6 mb-4">
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-xl font-bold">{data.summary.totalBooks}</p>
                <p className="text-xs text-muted-foreground">Titles</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-xl font-bold">{data.summary.totalCopies}</p>
                <p className="text-xs text-muted-foreground">Total Copies</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-xl font-bold text-green-600">{data.summary.available}</p>
                <p className="text-xs text-muted-foreground">Available</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-xl font-bold text-blue-600">{data.summary.issued}</p>
                <p className="text-xs text-muted-foreground">Issued</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-xl font-bold text-destructive">{data.summary.lost}</p>
                <p className="text-xs text-muted-foreground">Lost</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-xl font-bold text-orange-600">{data.summary.damaged}</p>
                <p className="text-xs text-muted-foreground">Damaged</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Stock Details {search && `(filtered: ${filtered?.length} of ${data.rows.length})`}</CardTitle>
            </CardHeader>
            <CardContent>
              {!filtered || filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No items found</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Author</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-center">Total</TableHead>
                      <TableHead className="text-center">Available</TableHead>
                      <TableHead className="text-center">Issued</TableHead>
                      <TableHead className="text-center">Lost</TableHead>
                      <TableHead className="text-center">Damaged</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium max-w-[160px] truncate">{item.title}</TableCell>
                        <TableCell className="text-sm max-w-[120px] truncate">{item.author}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{item.category}</Badge>
                        </TableCell>
                        <TableCell className="text-xs">{item.type}</TableCell>
                        <TableCell className="text-center font-medium">{item.totalCopies}</TableCell>
                        <TableCell className="text-center">
                          <span className={item.available === 0 ? "text-muted-foreground" : "text-green-600 font-medium"}>{item.available}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={item.issued > 0 ? "text-blue-600" : "text-muted-foreground"}>{item.issued}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={item.lost > 0 ? "text-destructive font-medium" : "text-muted-foreground"}>{item.lost}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={item.damaged > 0 ? "text-orange-600 font-medium" : "text-muted-foreground"}>{item.damaged}</span>
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
