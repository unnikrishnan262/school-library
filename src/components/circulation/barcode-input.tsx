"use client";

import { useRef, useEffect } from "react";
import { ScanBarcode } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface BarcodeInputProps {
  value: string;
  onChange: (value: string) => void;
  onScan: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
  disabled?: boolean;
}

export function BarcodeInput({
  value,
  onChange,
  onScan,
  placeholder = "Scan barcode or enter manually...",
  autoFocus = false,
  className,
  disabled,
}: BarcodeInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && value.trim()) {
      e.preventDefault();
      onScan(value.trim());
    }
  }

  return (
    <div className={cn("relative", className)}>
      <ScanBarcode className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="pl-9 font-mono"
        disabled={disabled}
      />
    </div>
  );
}
