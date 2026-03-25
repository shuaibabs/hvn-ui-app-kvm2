
"use client";

import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useApp } from '@/context/app-context';
import { Textarea } from './ui/textarea';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { CheckCircle, HelpCircle, TriangleAlert, XCircle } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Label } from './ui/label';

type BulkDeleteModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

type ReviewResult = {
  found: { mobile: string; id: string }[];
  notFound: string[];
  duplicates: string[];
};

export function BulkDeleteNumbersModal({ isOpen, onClose }: BulkDeleteModalProps) {
  const { numbers, deleteNumbers } = useApp();
  const [inputText, setInputText] = useState('');
  const [reviewResult, setReviewResult] = useState<ReviewResult | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState('');

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

  const handleDelete = () => {
    if (!reviewResult || reviewResult.found.length === 0) return;
     if (!reason.trim()) {
        setReasonError('A reason for deletion is required.');
        return;
    }
    setReasonError('');
    setIsDeleting(true);
    const idsToDelete = reviewResult.found.map(n => n.id);
    deleteNumbers(idsToDelete, reason);
    setIsDeleting(false);
    handleClose();
  };
  
  const handleClose = () => {
    setInputText('');
    setReviewResult(null);
    setIsDeleting(false);
    setReason('');
    setReasonError('');
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
          <DialogTitle>Bulk Delete from Master Inventory</DialogTitle>
          <DialogDescription>
            Paste a list of mobile numbers (separated by commas or newlines) to delete them. A reason is required. This action cannot be undone.
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
                <Alert variant="destructive">
                    <TriangleAlert className="h-4 w-4" />
                    <AlertTitle>Deletion Summary</AlertTitle>
                    <AlertDescription>
                        Please review the numbers below and provide a reason before confirming deletion. This action is permanent.
                    </AlertDescription>
                </Alert>
                <div className="space-y-3">
                    {renderList(reviewResult.found.map(n => n.mobile), "Numbers to be Deleted", "destructive")}
                    {renderList(reviewResult.notFound, "Numbers Not Found in Inventory", "outline")}
                    {renderList(reviewResult.duplicates, "Duplicate Numbers Ignored", "outline")}
                </div>
                <div className="space-y-2 mt-4">
                    <Label htmlFor="delete-reason">Reason for Deletion</Label>
                    <Textarea 
                        id="delete-reason" 
                        placeholder="e.g., Numbers sold to another party, data cleanup, etc."
                        value={reason}
                        onChange={(e) => {
                            setReason(e.target.value);
                            if (e.target.value.trim()) setReasonError('');
                        }}
                    />
                    {reasonError && <p className="text-sm font-medium text-destructive">{reasonError}</p>}
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
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={reviewResult.found.length === 0 || isDeleting}
                >
                    {isDeleting ? "Deleting..." : `Delete ${reviewResult.found.length} Number(s)`}
                </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
