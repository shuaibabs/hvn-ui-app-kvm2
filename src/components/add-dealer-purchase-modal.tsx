"use client";

import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useApp } from '@/context/app-context';
import { NewDealerPurchaseData } from '@/lib/data';
import { Combobox } from '@/components/ui/combobox';

const formSchema = z.object({
  mobile: z.string().regex(/^\d{10}$/, 'Mobile number must be 10 digits.'),
  price: z.coerce.number().min(0, 'Price cannot be negative.'),
  dealerName: z.string().min(1, 'Dealer name is required.'),
});

type AddDealerPurchaseModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function AddDealerPurchaseModal({ isOpen, onClose }: AddDealerPurchaseModalProps) {
  const { addDealerPurchase, dealers, addDealer } = useApp();

  const dealerOptions = useMemo(() => 
    dealers.map(d => ({ label: d.name, value: d.name })),
    [dealers]
  );

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      mobile: '',
      price: 0,
      dealerName: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    // If dealer doesn't exist, add it
    const trimmedName = values.dealerName.trim();
    const dealerExists = dealers.some(d => d.name.toLowerCase() === trimmedName.toLowerCase());
    if (!dealerExists) {
      await addDealer(trimmedName);
    }

    addDealerPurchase({
      ...values,
      dealerName: trimmedName
    } as NewDealerPurchaseData);
    
    onClose();
    form.reset();
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Dealer Purchase</DialogTitle>
          <DialogDescription>
            Enter the details for the new number purchased from a dealer.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} id="add-dealer-purchase-form" className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="mobile"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mobile Number</FormLabel>
                  <FormControl>
                    <Input placeholder="9876543210" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dealerName"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Dealer Name</FormLabel>
                  <Combobox
                    options={dealerOptions}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Select or enter new dealer"
                    searchPlaceholder="Type to search/add..."
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Price</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="Enter purchase price" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="add-dealer-purchase-form">Add Purchase</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
