
"use client";

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useApp } from '@/context/app-context';
import { NumberRecord } from '@/lib/data';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from './ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const formSchema = z.object({
  safeCustodyDate: z.date({ required_error: 'Safe custody date is required.' }),
  unsafeCustodyDate: z.date({ required_error: 'Unsafe custody date is required.' }),
});

type EditCocpDateModalProps = {
  isOpen: boolean;
  onClose: () => void;
  number: NumberRecord;
};

export function EditCocpDateModal({ isOpen, onClose, number }: EditCocpDateModalProps) {
  const { updateSafeCustodyDate, updateUnsafeCustodyDate } = useApp();
  const [isSafeDatePickerOpen, setIsSafeDatePickerOpen] = useState(false);
  const [isUnsafeDatePickerOpen, setIsUnsafeDatePickerOpen] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  useEffect(() => {
    if (number) {
      form.reset({
        safeCustodyDate: number.safeCustodyDate ? number.safeCustodyDate.toDate() : new Date(),
        unsafeCustodyDate: number.unsafeCustodyDate ? number.unsafeCustodyDate.toDate() : new Date(),
      });
    }
  }, [number, form]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    updateSafeCustodyDate(number.id, values.safeCustodyDate);
    updateUnsafeCustodyDate(number.id, values.unsafeCustodyDate);
    onClose();
  }

  const handleClose = () => {
    form.reset();
    onClose();
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit COCP Custody Dates</DialogTitle>
          <DialogDescription>
            Update the custody dates for COCP number <span className="font-semibold">{number.mobile}</span>.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} id="edit-cocp-date-form" className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="safeCustodyDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Safe Custody Date</FormLabel>
                  <Popover open={isSafeDatePickerOpen} onOpenChange={setIsSafeDatePickerOpen}>
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
                          field.onChange(date);
                          setIsSafeDatePickerOpen(false);
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="unsafeCustodyDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Unsafe Custody Date</FormLabel>
                  <Popover open={isUnsafeDatePickerOpen} onOpenChange={setIsUnsafeDatePickerOpen}>
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
                          field.onChange(date);
                          setIsUnsafeDatePickerOpen(false);
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
        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
          <Button type="submit" form="edit-cocp-date-form">Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
