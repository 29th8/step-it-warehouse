import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
// lib/utils.ts

// Hàm gộp các class Tailwind (thay thế cho cn của Shadcn)
export function classNames(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

// Hàm format ngày giờ
export function formatDate(dateString: string | Date, formatType: 'date' | 'datetime' = 'date'): string {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return 'N/A';
  }

  const options: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  };

  if (formatType === 'datetime') {
    options.hour = '2-digit';
    options.minute = '2-digit';
    options.second = '2-digit';
  }

  return date.toLocaleDateString('vi-VN', options);
}