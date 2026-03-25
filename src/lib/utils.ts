import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function calculateDigitalRoot(mobile: string): number {
  let sum = mobile
    .split('')
    .map(Number)
    .reduce((acc, digit) => acc + digit, 0);

  while (sum > 9) {
    sum = sum
      .toString()
      .split('')
      .map(Number)
      .reduce((acc, digit) => acc + digit, 0);
  }

  return sum;
}
