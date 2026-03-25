
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useApp } from '@/context/app-context';
import { Textarea } from './ui/textarea';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { CheckCircle, HelpCircle, TriangleAlert, XCircle } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { NewNumberData } from '@/lib/data';
import { useNavigation } from '@/context/navigation-context';

type AddNumbersReviewModalProps = {
  isOpen: boolean;
  onClose: () => void;
  formData: NewNumberData;
};

type ReviewResult = {
  valid: string[];
  invalid: string[];
  duplicates: string[];
  inputDuplicates: string[];
};

export function AddNumbersReviewModal({ isOpen, onClose, formData }: AddNumbersReviewModalProps) {
  const { addMultipleNumbers, isMobileNumberDuplicate } = useApp();
  const { navigate } = useNavigation();

  const [reviewResult, setReviewResult] = useState<ReviewResult>({ valid: [], invalid: [], duplicates: [], inputDuplicates: []});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen && formData) {
      const inputText = formData.mobile;
      const allNumbers = inputText
        .split(/[\n,]+/)
        .map(n => n.trim())
        .filter(n => n.length > 0);

      const uniqueNumbers = [...new Set(allNumbers)];
      
      const inputDuplicates = allNumbers.filter((item, index) => allNumbers.indexOf(item) !== index);

      const valid: string[] = [];
      const invalid: string[] = [];
      const duplicates: string[] = [];

      uniqueNumbers.forEach(mobile => {
        if (!/^\d{10}$/.test(mobile)) {
          invalid.push(mobile);
        } else if (isMobileNumberDuplicate(mobile)) {
          duplicates.push(mobile);
        } else {
          valid.push(mobile);
        }
      });

      setReviewResult({ valid, invalid, duplicates, inputDuplicates: [...new Set(inputDuplicates)] });
    }
  }, [isOpen, formData, isMobileNumberDuplicate]);


  const handleSave = async () => {
    if (!formData || reviewResult.valid.length === 0) return;
    setIsSaving(true);
    
    await addMultipleNumbers(formData, reviewResult.valid);
    
    setIsSaving(false);
    handleClose();
    navigate('/numbers');
  };
  
  const handleClose = () => {
    setReviewResult({ valid: [], invalid: [], duplicates: [], inputDuplicates: [] });
    setIsSaving(false);
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
          <DialogTitle>Review Numbers to Add</DialogTitle>
          <DialogDescription>
            Please review the numbers below before saving. Only valid, non-duplicate numbers will be added to the inventory.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
            <div className="space-y-3">
                {renderList(reviewResult.valid, "Numbers to be Added", "default")}
                {renderList(reviewResult.duplicates, "Existing Duplicates (Will be skipped)", "outline")}
                {renderList(reviewResult.inputDuplicates, "Duplicates in your input (Will be skipped)", "outline")}
                {renderList(reviewResult.invalid, "Invalid Format (Not 10 digits, will be skipped)", "destructive")}
            </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
            <Button 
                type="button" 
                onClick={handleSave}
                disabled={reviewResult.valid.length === 0 || isSaving}
            >
                {isSaving ? "Saving..." : `Save ${reviewResult.valid.length} Valid Number(s)`}
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
