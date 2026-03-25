
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';

type BulkUploadStatusChangeModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

type ReviewResult = {
  found: { mobile: string; id: string }[];
  notFound: string[];
  duplicates: string[];
};

export function BulkUploadStatusChangeModal({ isOpen, onClose }: BulkUploadStatusChangeModalProps) {
  const { numbers, bulkUpdateUploadStatus } = useApp();
  const [inputText, setInputText] = useState('');
  const [reviewResult, setReviewResult] = useState<ReviewResult | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [newStatus, setNewStatus] = useState<'Pending' | 'Done'>('Pending');

  const handleReview = () => {
    const inputNumbers = inputText
      .split(/[\n,]+/)
      .map(n => n.trim())
      .filter(n => n.length > 0);
    
    const uniqueInputNumbers = [...new Set(inputNumbers)];
    const duplicates = inputNumbers.filter((item, index) => inputNumbers.indexOf(item) !== index);

    const found: { mobile: string; id: string }[] = [];
    const notFound: string[] = [];

    const masterNumbersMap = new Map(numbers.map(n => [n.mobile, n.id]));

    uniqueInputNumbers.forEach(mobile => {
      if (masterNumbersMap.has(mobile)) {
        found.push({ mobile, id: masterNumbersMap.get(mobile)! });
      } else {
        notFound.push(mobile);
      }
    });

    setReviewResult({ found, notFound, duplicates: [...new Set(duplicates)] });
  };

  const handleUpdate = () => {
    if (!reviewResult || reviewResult.found.length === 0) return;
    setIsUpdating(true);
    const idsToUpdate = reviewResult.found.map(n => n.id);
    bulkUpdateUploadStatus(idsToUpdate, newStatus);
    setIsUpdating(false);
    handleClose();
  };
  
  const handleClose = () => {
    setInputText('');
    setReviewResult(null);
    setIsUpdating(false);
    setNewStatus('Pending');
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
          <DialogTitle>Bulk Change Upload Status</DialogTitle>
          <DialogDescription>
            Paste a list of mobile numbers to change their upload status.
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
                        Please review the numbers below before confirming the status change.
                    </AlertDescription>
                </Alert>
                <div className="space-y-3">
                    {renderList(reviewResult.found.map(n => n.mobile), "Numbers to be Updated", "default")}
                    {renderList(reviewResult.notFound, "Numbers Not Found in Inventory", "outline")}
                    {renderList(reviewResult.duplicates, "Duplicate Numbers Ignored", "outline")}
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="new-status">New Upload Status</Label>
                    <Select value={newStatus} onValueChange={(value: 'Pending' | 'Done') => setNewStatus(value)}>
                        <SelectTrigger id="new-status">
                            <SelectValue placeholder="Select a status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Pending">Pending</SelectItem>
                            <SelectItem value="Done">Done</SelectItem>
                        </SelectContent>
                    </Select>
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
                    disabled={reviewResult.found.length === 0 || isUpdating}
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
