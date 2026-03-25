import { cn } from '@/lib/utils';

export default function TrionexLogo({ className, color }: { className?: string, color?: string }) {
  const primaryColor = color || 'hsl(var(--primary))';
  const foregroundColor = color ? '#FFF' : 'hsl(var(--foreground))';

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 230 25" // increased width a bit to fit spacing 0 0 170 25
      className={cn('h-6 w-auto', className)}
      aria-label="Trionex Digital Logo"
    >
      <title>Trionex Digital Logo</title>

      {/* --- Logo Icon --- */}
      <image
        href="/assets/logo/logo.png"
        x="0"
        y="0"
        width="24"
        height="24"
      />

      {/* --- Trionex --- */}
      <text
        x="30"
        y="20"
        fontFamily="'Space Grotesk', sans-serif"
        fontSize="24"
        fontWeight="bold"
        fill={primaryColor}
      >
        Trionex
      </text>

      {/* --- Digital --- */}
      <text
        x="120" // 🔥 increased from 115 → 130 for better spacing
        y="20"
        fontFamily="'Space Grotesk', sans-serif"
        fontSize="24"
        fontWeight="500"
        fill={foregroundColor}
      >
        Digital
      </text>
    </svg>
  );
}
