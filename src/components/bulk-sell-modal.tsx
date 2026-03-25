

"use client";

import React, { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useApp } from '@/context/app-context';
import type { NumberRecord } from '@/lib/data';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { Combobox } from './ui/combobox';

const formSchema = z.object({
  salePrice: z.coerce.number().min(0, "Sale price can't be negative."),
  soldTo: z.string().min(1, 'Sold to is required.'),
  saleDate: z.date({ required_error: 'Sale date is required.' }),
});

type BulkSellNumberModalProps = {
  isOpen: boolean;
  onClose: () => void;
  selectedNumbers: NumberRecord[];
  isPreBooking?: boolean;
};

export function BulkSellNumberModal({ isOpen, onClose, selectedNumbers, isPreBooking = false }: BulkSellNumberModalProps) {
  const { bulkSellNumbers, bulkSellPreBookedNumbers, vendors, addSalesVendor } = useApp();
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  const vendorOptions = useMemo(() => {
    return vendors.map(v => ({ label: v, value: v }));
  }, [vendors]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      salePrice: 0,
      soldTo: '',
      saleDate: new Date(),
    },
  });

  const totalPurchasePrice = useMemo(() => {
    return selectedNumbers.reduce((acc, num) => {
      const price = num.purchasePrice ?? (num as any).originalNumberData?.purchasePrice ?? 0;
      return acc + price;
    }, 0);
  }, [selectedNumbers]);

  React.useEffect(() => {
    if (isOpen) {
      form.reset({
        salePrice: 0,
        soldTo: '',
        saleDate: new Date(),
      });
    }
  }, [isOpen, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    await addSalesVendor(values.soldTo);
    if (isPreBooking) {
      bulkSellPreBookedNumbers(selectedNumbers, values);
    } else {
      bulkSellNumbers(selectedNumbers, values);
    }
    onClose();
  }

  const title = isPreBooking ? "Bulk Sell Pre-Booked Numbers" : "Bulk Mark as Sold";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Enter sales details for the selected {selectedNumbers.length} number(s). These details will be applied to all.
            Total purchase price: <span className='font-semibold'>₹{totalPurchasePrice.toLocaleString()}</span>.
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
            <form onSubmit={form.handleSubmit(onSubmit)} id="bulk-sell-number-form" className="space-y-4">
              <FormField
                control={form.control}
                name="salePrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sale Price (for each)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="Enter sale price" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="soldTo"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Sold To</FormLabel>
                    <Combobox
                      options={vendorOptions}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Select or type a name..."
                      searchPlaceholder="Search or add new..."
                      emptyMessage="No matching vendor found."
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="saleDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Sale Date</FormLabel>
                    <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={(date) => {
                            if (date) field.onChange(date);
                            setIsDatePickerOpen(false);
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="bulk-sell-number-form">Mark {selectedNumbers.length} as Sold</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
