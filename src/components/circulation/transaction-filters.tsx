"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function TransactionFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") params.set(key, value);
    else params.delete(key);
    params.delete("page");
    router.push(`/circulation/transactions?${params.toString()}`);
  }

  return (
    <div className="flex gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search book title, member name, accession..."
          className="pl-9"
          defaultValue={searchParams.get("search") || ""}
          onChange={(e) => {
            const v = e.target.value;
            const t = setTimeout(() => update("search", v), 400);
            return () => clearTimeout(t);
          }}
        />
      </div>
      <Select defaultValue={searchParams.get("status") || "all"} onValueChange={(v) => update("status", v)}>
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="All Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="ISSUED">Issued</SelectItem>
          <SelectItem value="RETURNED">Returned</SelectItem>
          <SelectItem value="LOST">Lost</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
