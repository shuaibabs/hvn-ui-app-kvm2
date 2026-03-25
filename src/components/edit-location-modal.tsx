
"use client";

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useApp } from '@/context/app-context';
import type { NumberRecord } from '@/lib/data';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';

const formSchema = z.object({
  locationType: z.enum(['Store', 'Employee', 'Dealer']),
  currentLocation: z.string().min(1, { message: 'Current location is required.' }),
});

type EditLocationModalProps = {
  isOpen: boolean;
  onClose: () => void;
  selectedNumbers: NumberRecord[];
};

export function EditLocationModal({ isOpen, onClose, selectedNumbers }: EditLocationModalProps) {
  const { updateNumberLocation } = useApp();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      locationType: 'Store',
      currentLocation: '',
    },
  });
  
  useEffect(() => {
    if (isOpen && selectedNumbers.length === 1) {
      form.reset({
        locationType: selectedNumbers[0].locationType,
        currentLocation: selectedNumbers[0].currentLocation,
      });
    } else if (isOpen) {
       form.reset({
        locationType: 'Store',
        currentLocation: '',
      });
    }
  }, [isOpen, selectedNumbers, form]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    const numberIds = selectedNumbers.map(n => n.id);
    updateNumberLocation(numberIds, values);
    onClose();
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Number Location</DialogTitle>
          <DialogDescription>
            Update the location for the selected {selectedNumbers.length} number(s).
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
            {selectedNumbers.length > 1 && (
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
            )}
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} id="edit-location-form" className="space-y-4">
                <FormField
                  control={form.control}
                  name="locationType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Location Type</FormLabel>
                       <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Store">Store</SelectItem>
                          <SelectItem value="Employee">Employee</SelectItem>
                          <SelectItem value="Dealer">Dealer</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="currentLocation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Current Location</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Mumbai Store" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </Form>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="edit-location-form">Update Location</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
