
"use client";

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useApp } from '@/context/app-context';
import type { NumberRecord } from '@/lib/data';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import React from 'react';

const formSchema = z.object({
  uploadStatus: z.enum(['Pending', 'Done']),
});

type BulkEditUploadStatusModalProps = {
  isOpen: boolean;
  onClose: () => void;
  selectedNumbers: NumberRecord[];
};

export function BulkEditUploadStatusModal({ isOpen, onClose, selectedNumbers }: BulkEditUploadStatusModalProps) {
  const { bulkUpdateUploadStatus } = useApp();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      uploadStatus: 'Pending',
    },
  });

  React.useEffect(() => {
    if (isOpen) {
      form.reset({
        uploadStatus: 'Pending',
      });
    }
  }, [isOpen, form]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    const numberIds = selectedNumbers.map(s => s.id);
    bulkUpdateUploadStatus(numberIds, values.uploadStatus);
    onClose();
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Bulk Edit Upload Status</DialogTitle>
          <DialogDescription>
            Update the upload status for the selected {selectedNumbers.length} number(s).
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
            <div>
                <p className="text-sm font-medium mb-2">Selected Numbers:</p>
                <ScrollArea className="h-24 w-full rounded-md border p-2">
                    <div className="flex flex-wrap gap-2">
                        {selectedNumbers.map(num => (
                            <Badge key={num.id} variant="secondary">{num.mobile}</Badge>
                        ))}
                    </div>
                </ScrollArea>
            </div>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} id="bulk-edit-upload-status-form" className="space-y-4">
                <FormField
                  control={form.control}
                  name="uploadStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Upload Status</FormLabel>
                       <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Pending">Pending</SelectItem>
                          <SelectItem value="Done">Done</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </Form>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="bulk-edit-upload-status-form">Update Status</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
