
"use client";

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useApp } from '@/context/app-context';
import type { SaleRecord } from '@/lib/data';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import React from 'react';

const formSchema = z.object({
  upcStatus: z.enum(['Pending', 'Generated']),
});

type BulkEditUpcModalProps = {
  isOpen: boolean;
  onClose: () => void;
  selectedSales: SaleRecord[];
};

export function BulkEditUpcModal({ isOpen, onClose, selectedSales }: BulkEditUpcModalProps) {
  const { bulkUpdateUpcStatus } = useApp();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      upcStatus: 'Pending',
    },
  });

  React.useEffect(() => {
    if (isOpen) {
      form.reset({
        upcStatus: 'Pending',
      });
    }
  }, [isOpen, form]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    const saleIds = selectedSales.map(s => s.id);
    bulkUpdateUpcStatus(saleIds, values.upcStatus);
    onClose();
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Bulk Edit UPC Status</DialogTitle>
          <DialogDescription>
            Update the UPC status for the selected {selectedSales.length} sale(s).
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
            <div>
                <p className="text-sm font-medium mb-2">Selected Sales (by Mobile Number):</p>
                <ScrollArea className="h-24 w-full rounded-md border p-2">
                    <div className="flex flex-wrap gap-2">
                        {selectedSales.map(sale => (
                            <Badge key={sale.id} variant="secondary">{sale.mobile}</Badge>
                        ))}
                    </div>
                </ScrollArea>
            </div>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} id="bulk-edit-upc-form" className="space-y-4">
                <FormField
                  control={form.control}
                  name="upcStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New UPC Status</FormLabel>
                       <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Pending">Pending</SelectItem>
                          <SelectItem value="Generated">Generated</SelectItem>
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
          <Button type="submit" form="bulk-edit-upc-form">Update Status</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
