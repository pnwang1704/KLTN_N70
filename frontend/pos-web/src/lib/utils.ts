import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string) {
  const num = typeof amount === 'number' ? amount : Number(amount) || 0;
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(num);
}

export function formatPaymentMethod(method?: string): string {
  if (!method) return 'Chưa TT';
  const m = String(method).toUpperCase();
  if (m === 'CASH' || m === 'TIEN_MAT' || m === 'TIỀN MẶT') return 'Tiền mặt';
  if (m === 'BANK_TRANSFER' || m === 'CHUYEN_KHOAN' || m === 'CHUYỂN KHOẢN' || m === 'VIETQR') return 'Chuyển khoản (VietQR)';
  return method;
}

export function formatDate(dateString: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateString));
}
