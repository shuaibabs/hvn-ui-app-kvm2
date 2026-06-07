"use client";

import { useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Search, X } from 'lucide-react';

const LEN = 10;

/** Build the 10 box values (digit or '') from a placement string. */
const parseBoxes = (p: string): string[] => {
  const arr = Array(LEN).fill('');
  for (let i = 0; i < Math.min(p?.length || 0, LEN); i++) {
    const c = p[i];
    if (c >= '0' && c <= '9') arr[i] = c;
  }
  return arr;
};

/** Build the placement string ('_' = empty box) from the 10 box values. Empty if no digit set. */
const buildValue = (boxes: string[]): string =>
  boxes.some(b => b !== '') ? boxes.map(b => (b === '' ? '_' : b)).join('') : '';

type Props = {
  /** Placement string: digits at fixed positions, '_' for "any". Empty = no constraint. */
  value: string;
  onChange: (value: string) => void;
  onSearch?: () => void;
};

/**
 * Exact-digit-placement search bar: a row of 10 boxes (one per digit position).
 * Fill a box to require that digit at that position; leave it empty to allow any digit.
 */
export function ExactPlacementSearch({ value, onChange, onSearch }: Props) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const boxes = parseBoxes(value);

  const setBox = (i: number, raw: string) => {
    const v = raw.replace(/\D/g, '').slice(-1); // keep only the latest digit typed
    const next = parseBoxes(value);
    next[i] = v;
    onChange(buildValue(next));
    if (v && i < LEN - 1) refs.current[i + 1]?.focus();
  };

  const onKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !boxes[i] && i > 0) {
      refs.current[i - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && i > 0) {
      refs.current[i - 1]?.focus();
    } else if (e.key === 'ArrowRight' && i < LEN - 1) {
      refs.current[i + 1]?.focus();
    } else if (e.key === 'Enter') {
      onSearch?.();
    }
  };

  const onPaste = (i: number, e: React.ClipboardEvent<HTMLInputElement>) => {
    const digits = e.clipboardData.getData('text').replace(/\D/g, '');
    if (!digits) return;
    e.preventDefault();
    const next = parseBoxes(value);
    for (let k = 0; k < digits.length && i + k < LEN; k++) next[i + k] = digits[k];
    onChange(buildValue(next));
    refs.current[Math.min(i + digits.length, LEN - 1)]?.focus();
  };

  return (
    <div className="mb-4 rounded-lg border bg-card p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <Label className="text-sm font-medium">
          Fill digits at exact placement where you want, and leave the other boxes empty
        </Label>
        <Button type="button" variant="secondary" size="sm" onClick={() => onChange('')} disabled={!value}>
          <X className="mr-1 h-3.5 w-3.5" /> Clear All
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {boxes.map((b, i) => (
          <Input
            key={i}
            ref={(el) => { refs.current[i] = el; }}
            value={b}
            inputMode="numeric"
            maxLength={1}
            aria-label={`Digit position ${i + 1}`}
            onChange={(e) => setBox(i, e.target.value)}
            onKeyDown={(e) => onKeyDown(i, e)}
            onPaste={(e) => onPaste(i, e)}
            className="h-12 w-10 shrink-0 text-center text-lg font-semibold sm:w-12"
          />
        ))}
        <Button type="button" onClick={() => onSearch?.()} className="ml-auto h-12 px-6 sm:ml-2">
          <Search className="mr-2 h-4 w-4" /> Search
        </Button>
      </div>
    </div>
  );
}
