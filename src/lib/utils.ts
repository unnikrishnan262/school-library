import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, differenceInDays } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  return format(new Date(date), "dd MMM yyyy");
}

export function formatDateTime(date: Date | string): string {
  return format(new Date(date), "dd MMM yyyy, hh:mm a");
}

export function calculateDaysOverdue(dueDate: Date | string): number {
  const days = differenceInDays(new Date(), new Date(dueDate));
  return days > 0 ? days : 0;
}

export function formatCurrency(amount: number): string {
  return `₹${amount.toFixed(2)}`;
}
