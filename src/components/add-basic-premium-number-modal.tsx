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
import { NewNumberData } from '@/lib/data';
import { Combobox } from '@/components/ui/combobox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const formSchema = z.object({
  mobile: z.string().regex(/^\d{10}$/, 'Mobile number must be 10 digits.'),
  purchasePrice: z.coerce.number().min(0, 'Purchase price cannot be negative.'),
  purchaseFrom: z.string().min(1, 'Vendor name is required.'),
  stockType: z.enum(['Premium', 'Basic']),
  salePrice: z.coerce.number().min(0, 'Sale price cannot be negative.'),
});

type AddBasicPremiumNumberModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function AddBasicPremiumNumberModal({ isOpen, onClose }: AddBasicPremiumNumberModalProps) {
  const { addBasicPremiumNumber, basicPremiumVendors, addBasicPremiumVendor } = useApp();

  const vendorOptions = useMemo(() => 
    basicPremiumVendors.map(v => ({ label: v.name, value: v.name })),
    [basicPremiumVendors]
  );

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      mobile: '',
      purchasePrice: 0,
      purchaseFrom: '',
      stockType: 'Basic',
      salePrice: 0,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const trimmedVendor = values.purchaseFrom.trim();
    const vendorExists = basicPremiumVendors.some(v => v.name.toLowerCase() === trimmedVendor.toLowerCase());
    if (!vendorExists) {
      await addBasicPremiumVendor(trimmedVendor);
    }

    const collectionType = values.stockType.toLowerCase() as 'basic' | 'premium';
    
    const numberData: NewNumberData = {
      mobile: values.mobile,
      purchasePrice: values.purchasePrice,
      purchaseFrom: trimmedVendor,
      salePrice: values.salePrice,
      purchaseDate: new Date(),
      status: 'Non-RTP',
      numberType: 'Prepaid',
      uploadStatus: 'Pending',
      ownershipType: 'Individual',
      currentLocation: 'Dealer',
      locationType: 'Dealer',
      assignedTo: 'Unassigned',
      name: 'Unassigned',
      notes: '',
    };

    addBasicPremiumNumber(numberData, collectionType);
    
    onClose();
    form.reset({
      mobile: '',
      purchasePrice: 0,
      purchaseFrom: '',
      stockType: 'Basic',
      salePrice: 0,
    });
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Basic/Premium Number</DialogTitle>
          <DialogDescription>
            Add a new number to Basic or Premium inventory.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} id="add-bp-number-form" className="space-y-4 py-4 max-h-[70vh] overflow-y-auto px-1">
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
              name="purchaseFrom"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Vendor Name</FormLabel>
                  <Combobox
                    options={vendorOptions}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Select or enter new vendor"
                    searchPlaceholder="Type to search/add..."
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="stockType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Stock Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select stock type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Premium">Premium Stock</SelectItem>
                      <SelectItem value="Basic">Basic Stock</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="purchasePrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Purchase Price</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="salePrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Intended Sale Price</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </form>
        </Form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="add-bp-number-form">Add Number</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
