
"use client";

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useApp } from '@/context/app-context';
import { Textarea } from './ui/textarea';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { TriangleAlert } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { Label } from './ui/label';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

type BulkChangeCocpDateModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

type ReviewResult = {
  found: { mobile: string; id: string }[];
  notFound: string[];
  notCocp: string[];
  duplicates: string[];
};

export function BulkChangeCocpDateModal({ isOpen, onClose }: BulkChangeCocpDateModalProps) {
  const { numbers, bulkUpdateSafeCustodyDate } = useApp();
  const [inputText, setInputText] = useState('');
  const [reviewResult, setReviewResult] = useState<ReviewResult | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [newDate, setNewDate] = useState<Date | undefined>(undefined);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);


  const handleReview = () => {
    const inputNumbers = inputText
      .split(/[\n,]+/)
      .map(n => n.trim())
      .filter(n => n.length > 0);
    
    const uniqueInputNumbers = [...new Set(inputNumbers)];
    const duplicates = inputNumbers.filter((item, index) => inputNumbers.indexOf(item) !== index);

    const found: { mobile: string; id: string }[] = [];
    const notFound: string[] = [];
    const notCocp: string[] = [];

    const masterNumbersMap = new Map(numbers.map(n => [n.mobile, { id: n.id, type: n.numberType }]));

    uniqueInputNumbers.forEach(mobile => {
      const numberInfo = masterNumbersMap.get(mobile);
      if (numberInfo) {
        if (numberInfo.type === 'COCP') {
            found.push({ mobile, id: numberInfo.id });
        } else {
            notCocp.push(mobile);
        }
      } else {
        notFound.push(mobile);
      }
    });

    setReviewResult({ found, notFound, notCocp, duplicates: [...new Set(duplicates)] });
  };

  const handleUpdate = () => {
    if (!reviewResult || reviewResult.found.length === 0 || !newDate) return;
    setIsUpdating(true);
    const idsToUpdate = reviewResult.found.map(n => n.id);
    bulkUpdateSafeCustodyDate(idsToUpdate, newDate);
    setIsUpdating(false);
    handleClose();
  };
  
  const handleClose = () => {
    setInputText('');
    setReviewResult(null);
    setIsUpdating(false);
    setNewDate(undefined);
    onClose();
  }

  const renderList = (items: string[], title: string, variant: "default" | "secondary" | "destructive" | "outline" = "secondary") => (
    <div>
        <p className="font-medium text-sm mb-1">{title} ({items.length})</p>
        {items.length > 0 ? (
            <ScrollArea className="h-20 w-full rounded-md border p-2">
                <div className="flex flex-wrap gap-1">
                    {items.map((item, index) => <Badge key={index} variant={variant}>{item}</Badge>)}
                </div>
            </ScrollArea>
        ) : <p className="text-sm text-muted-foreground italic">None</p>}
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Bulk Change Safe Custody Date</DialogTitle>
          <DialogDescription>
            Paste COCP numbers to change their Safe Custody Date.
          </DialogDescription>
        </DialogHeader>
        
        {!reviewResult ? (
            <div className="py-4 space-y-4">
                 <Textarea
                    placeholder="9876543210, 9876543211..."
                    className="min-h-[150px]"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                />
            </div>
        ) : (
            <div className="py-4 space-y-4">
                <Alert variant="default" className="bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800">
                    <TriangleAlert className="h-4 w-4 text-blue-600" />
                    <AlertTitle>Review Change</AlertTitle>
                    <AlertDescription>
                        Please review the numbers before confirming the date change.
                    </AlertDescription>
                </Alert>
                <div className="space-y-3">
                    {renderList(reviewResult.found.map(n => n.mobile), "COCP Numbers to be Updated", "default")}
                    {renderList(reviewResult.notFound, "Numbers Not Found", "outline")}
                    {renderList(reviewResult.notCocp, "Numbers Found (but not COCP)", "outline")}
                    {renderList(reviewResult.duplicates, "Duplicate Numbers Ignored", "outline")}
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="new-date">New Safe Custody Date</Label>
                     <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                        <PopoverTrigger asChild>
                            <Button
                            variant={"outline"}
                            className={cn(
                                "w-full justify-start text-left font-normal",
                                !newDate && "text-muted-foreground"
                            )}
                            >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {newDate ? format(newDate, "PPP") : <span>Pick a date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar
                            mode="single"
                            selected={newDate}
                            onSelect={(date) => {
                                setNewDate(date);
                                setIsDatePickerOpen(false);
                            }}
                            initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                 </div>
            </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {!reviewResult ? (
            <>
                <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
                <Button type="button" onClick={handleReview} disabled={!inputText.trim()}>Review Numbers</Button>
            </>
          ) : (
            <>
                <Button type="button" variant="ghost" onClick={() => setReviewResult(null)}>Back</Button>
                <Button 
                    type="button" 
                    onClick={handleUpdate}
                    disabled={reviewResult.found.length === 0 || isUpdating || !newDate}
                >
                    {isUpdating ? "Updating..." : `Update ${reviewResult.found.length} Number(s)`}
                </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
