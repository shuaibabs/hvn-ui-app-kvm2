
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { SaleRecord } from '@/lib/data';
import { Separator } from './ui/separator';
import { cn } from '@/lib/utils';

type SaleDetailsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  sale: SaleRecord | null;
};

function DetailItem({ label, value, className }: { label: string; value: React.ReactNode, className?: string }) {
    if (value === null || value === undefined || value === '') return null;
    return (
      <div className={cn("grid grid-cols-2 gap-2 items-center", className)}>
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <div className="text-sm font-semibold">{value}</div>
      </div>
    );
}

export function SaleDetailsModal({ isOpen, onClose, sale }: SaleDetailsModalProps) {
  if (!sale) return null;

  const purchasePrice = sale.originalNumberData?.purchasePrice ?? 0;
  const salePrice = sale.salePrice;
  const profitLoss = salePrice - purchasePrice;
  const isProfit = profitLoss >= 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sale Details</DialogTitle>
          <DialogDescription>
            Detailed breakdown for the sale of <span className="font-semibold">{sale.mobile}</span>.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
            <div className="space-y-2">
                <h4 className="font-medium text-sm text-primary">Purchase Details</h4>
                <DetailItem label="Purchase From" value={sale.originalNumberData?.purchaseFrom} />
                <DetailItem label="Purchase Price" value={`₹${purchasePrice.toLocaleString()}`} />
            </div>
            <Separator />
            <div className="space-y-2">
                <h4 className="font-medium text-sm text-primary">Sale Details</h4>
                <DetailItem label="Sold To" value={sale.soldTo} />
                <DetailItem label="Sale Price" value={`₹${salePrice.toLocaleString()}`} />
            </div>
            <Separator />
             <DetailItem 
                label={isProfit ? "Profit" : "Loss"} 
                value={`₹${Math.abs(profitLoss).toLocaleString()}`} 
                className={isProfit ? "text-green-600" : "text-red-600"}
            />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
