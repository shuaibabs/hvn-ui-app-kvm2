
"use client";

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useApp } from '@/context/app-context';
import type { NumberRecord } from '@/lib/data';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import React, { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from './ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const formSchema = z.object({
  safeCustodyDate: z.date({ required_error: 'A date is required.' }),
});

type BulkEditCocpDateModalProps = {
  isOpen: boolean;
  onClose: () => void;
  selectedNumbers: NumberRecord[];
};

export function BulkEditCocpDateModal({ isOpen, onClose, selectedNumbers }: BulkEditCocpDateModalProps) {
  const { bulkUpdateSafeCustodyDate } = useApp();
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {},
  });

  React.useEffect(() => {
    if (isOpen) {
      form.reset();
    }
  }, [isOpen, form]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    const numberIds = selectedNumbers.map(s => s.id);
    bulkUpdateSafeCustodyDate(numberIds, values.safeCustodyDate);
    onClose();
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Bulk Edit Safe Custody Date</DialogTitle>
          <DialogDescription>
            Update the safe custody date for the selected {selectedNumbers.length} COCP number(s).
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
              <form onSubmit={form.handleSubmit(onSubmit)} id="bulk-edit-cocp-date-form" className="space-y-4">
                <FormField
                  control={form.control}
                  name="safeCustodyDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>New Safe Custody Date</FormLabel>
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
          <Button type="submit" form="bulk-edit-cocp-date-form">Update Date</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
