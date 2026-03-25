
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
import { Input } from './ui/input';
import { useEffect } from 'react';

const formSchema = z.object({
  employeeName: z.string().min(1, { message: 'Please select an employee.' }),
  locationType: z.enum(['Store', 'Employee', 'Dealer']),
  currentLocation: z.string().min(1, { message: 'Current location is required.' }),
});

type AssignNumbersModalProps = {
  isOpen: boolean;
  onClose: () => void;
  selectedNumbers: NumberRecord[];
};

export function AssignNumbersModal({ isOpen, onClose, selectedNumbers }: AssignNumbersModalProps) {
  const { assignNumbersToEmployee, employees } = useApp();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      employeeName: '',
      locationType: 'Employee',
      currentLocation: '',
    },
  });

  const employeeName = form.watch('employeeName');

  useEffect(() => {
    if (employeeName) {
      form.setValue('currentLocation', `Employee - ${employeeName}`);
    }
  }, [employeeName, form]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    const numberIds = selectedNumbers.map(n => n.id);
    assignNumbersToEmployee(numberIds, values.employeeName, {
        locationType: values.locationType,
        currentLocation: values.currentLocation,
    });
    onClose();
    form.reset();
  }
  
  const handleClose = () => {
    form.reset();
    onClose();
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Numbers</DialogTitle>
          <DialogDescription>
            Assign the selected {selectedNumbers.length} number(s) to an employee and update their location.
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
              <form onSubmit={form.handleSubmit(onSubmit)} id="assign-form" className="space-y-4">
                <FormField
                  control={form.control}
                  name="employeeName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assign to Employee</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select an employee" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {employees.map(employee => (
                            <SelectItem key={employee} value={employee}>{employee}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
                        <Input placeholder="e.g. Employee - John Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </Form>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
          <Button type="submit" form="assign-form">Assign</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
