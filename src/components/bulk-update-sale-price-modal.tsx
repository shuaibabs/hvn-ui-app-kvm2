"use client";

import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useApp } from '@/context/app-context';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { TriangleAlert, Upload, FileType, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import Papa from 'papaparse';
import { useToast } from '@/hooks/use-toast';

type BulkUpdateSalePriceModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

type UpdateRecord = {
    mobile: string;
    salePrice: number;
}

type ReviewResult = {
  found: UpdateRecord[];
  notFound: string[];
  invalid: { mobile: string; reason: string }[];
  duplicates: string[];
};

export function BulkUpdateSalePriceModal({ isOpen, onClose }: BulkUpdateSalePriceModalProps) {
  const { numbers, bulkUpdateSalePrice } = useApp();
  const { toast } = useToast();
  const [reviewResult, setReviewResult] = useState<ReviewResult | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: header => header.trim(),
      complete: (results) => {
        const data = results.data as any[];
        const headers = results.meta.fields || [];
        
        // Find correct headers (case insensitive)
        const mobileHeader = headers.find(h => ['mobile', 'numbers', 'number'].includes(h.toLowerCase()));
        const priceHeader = headers.find(h => ['saleprice', 'price', 'sale price'].includes(h.toLowerCase()));

        if (!mobileHeader || !priceHeader) {
          toast({
            variant: "destructive",
            title: "Invalid CSV Format",
            description: "CSV must contain 'Mobile' and 'SalePrice' columns.",
          });
          return;
        }

        processData(data, mobileHeader, priceHeader);
      },
      error: (error) => {
        toast({
          variant: "destructive",
          title: "CSV Parse Error",
          description: error.message,
        });
      }
    });

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const processData = (data: any[], mobileKey: string, priceKey: string) => {
    const found: UpdateRecord[] = [];
    const notFound: string[] = [];
    const invalid: { mobile: string; reason: string }[] = [];
    const duplicates: string[] = [];
    
    const seenMobiles = new Set<string>();
    const inventoryMap = new Map(numbers.map(n => [n.mobile, n.id]));

    data.forEach(row => {
      const mobile = row[mobileKey]?.toString().trim();
      const priceRaw = row[priceKey]?.toString().trim();
      
      if (!mobile) return;

      if (!/^\d{10}$/.test(mobile)) {
        invalid.push({ mobile, reason: 'Invalid mobile number (must be 10 digits)' });
        return;
      }

      if (seenMobiles.has(mobile)) {
        duplicates.push(mobile);
        return;
      }
      seenMobiles.add(mobile);

      const price = parseFloat(priceRaw);
      if (isNaN(price) || price < 0) {
        invalid.push({ mobile, reason: 'Invalid sale price (must be a positive number)' });
        return;
      }

      if (inventoryMap.has(mobile)) {
        found.push({ mobile, salePrice: price });
      } else {
        notFound.push(mobile);
      }
    });

    setReviewResult({ found, notFound, invalid, duplicates });
  };

  const handleUpdate = async () => {
    if (!reviewResult || reviewResult.found.length === 0) return;
    setIsUpdating(true);
    try {
        await bulkUpdateSalePrice(reviewResult.found);
        handleClose();
    } catch (error) {
        console.error("Bulk update failed:", error);
    } finally {
        setIsUpdating(false);
    }
  };
  
  const handleClose = () => {
    setReviewResult(null);
    setIsUpdating(false);
    onClose();
  }

  const renderList = (items: string[], title: string, icon: React.ReactNode, variant: "default" | "secondary" | "destructive" | "outline" = "secondary") => (
    <div className="space-y-1">
        <div className="flex items-center gap-1.5 font-medium text-sm">
            {icon}
            <span>{title} ({items.length})</span>
        </div>
        {items.length > 0 ? (
            <ScrollArea className="h-24 w-full rounded-md border bg-muted/30 p-2">
                <div className="flex flex-wrap gap-1">
                    {items.map((item, index) => <Badge key={index} variant={variant}>{item}</Badge>)}
                </div>
            </ScrollArea>
        ) : <p className="text-sm text-muted-foreground italic ml-6">None</p>}
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Bulk Update Sale Price</DialogTitle>
          <DialogDescription>
            Upload a CSV file with columns <strong>Mobile</strong> and <strong>SalePrice</strong> to update inventory.
          </DialogDescription>
        </DialogHeader>
        
        {!reviewResult ? (
            <div className="py-8 flex flex-col items-center justify-center border-2 border-dashed rounded-lg bg-muted/10 hover:bg-muted/20 transition-colors cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                 <Upload className="h-10 w-10 text-muted-foreground mb-4" />
                 <p className="text-sm font-medium">Click to upload CSV file</p>
                 <p className="text-xs text-muted-foreground mt-1">Columns needed: Mobile, SalePrice</p>
                 <input 
                    type="file" 
                    ref={fileInputRef}
                    className="hidden" 
                    accept=".csv" 
                    onChange={handleFileUpload} 
                />
            </div>
        ) : (
            <div className="py-2 space-y-5">
                <Alert variant={reviewResult.found.length > 0 ? "default" : "destructive"} className={reviewResult.found.length > 0 ? "bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800" : ""}>
                    <TriangleAlert className="h-4 w-4" />
                    <AlertTitle>Review Changes</AlertTitle>
                    <AlertDescription>
                        {reviewResult.found.length > 0 
                            ? `Found ${reviewResult.found.length} numbers to update.`
                            : "No valid numbers found in the CSV that exist in inventory."}
                    </AlertDescription>
                </Alert>
                
                <div className="space-y-4">
                    {renderList(reviewResult.found.map(n => `${n.mobile}: ₹${n.salePrice}`), "Numbers to be Updated", <CheckCircle2 className="h-4 w-4 text-green-600" />, "default")}
                    
                    {reviewResult.notFound.length > 0 && 
                        renderList(reviewResult.notFound, "Numbers Not in Inventory", <XCircle className="h-4 w-4 text-red-600" />, "outline")
                    }
                    
                    {reviewResult.invalid.length > 0 && 
                        renderList(reviewResult.invalid.map(i => `${i.mobile}: ${i.reason}`), "Invalid Format Entries", <AlertCircle className="h-4 w-4 text-amber-600" />, "destructive")
                    }

                    {reviewResult.duplicates.length > 0 && 
                        renderList(reviewResult.duplicates, "Duplicate Numbers (Ignored)", <FileType className="h-4 w-4 text-slate-600" />, "secondary")
                    }
                </div>
            </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0 mt-4">
          {!reviewResult ? (
            <Button type="button" variant="outline" onClick={handleClose} className="w-full sm:w-auto">Cancel</Button>
          ) : (
            <>
                <Button type="button" variant="ghost" onClick={() => setReviewResult(null)}>Back</Button>
                <Button 
                    type="button" 
                    onClick={handleUpdate}
                    disabled={reviewResult.found.length === 0 || isUpdating}
                    className="bg-primary hover:bg-primary/90"
                >
                    {isUpdating ? "Updating..." : `Update ${reviewResult.found.length} Sale Price(s)`}
                </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
