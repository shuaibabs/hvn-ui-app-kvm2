
"use client";

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useApp } from '@/context/app-context';
import { NewReminderData } from '@/lib/data';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from './ui/calendar';
import { useState } from 'react';
import { MultiSelect } from './ui/multi-select';
import { useAuth } from '@/context/auth-context';

const formSchema = z.object({
  taskName: z.string().min(1, 'Task name is required.'),
  assignedTo: z.array(z.string()).min(1, 'Please select at least one employee.'),
  dueDate: z.date({ required_error: 'Due date is required.'}),
});

type AddReminderModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function AddReminderModal({ isOpen, onClose }: AddReminderModalProps) {
  const { addReminder, employees, users } = useApp();
  const { role } = useAuth();
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  
  const employeeOptions = users.map(u => ({ label: u.displayName, value: u.displayName }));

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      taskName: '',
      assignedTo: [],
      dueDate: new Date(),
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    addReminder(values as NewReminderData);
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
          <DialogTitle>Add New Reminder</DialogTitle>
          <DialogDescription>
            Assign a new task to one or more employees.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} id="add-reminder-form" className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="taskName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Task Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Follow up with customer" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="assignedTo"
              render={({ field }) => (
                <FormItem>
                    <FormLabel>Assign To</FormLabel>
                    <MultiSelect
                        options={employeeOptions}
                        selected={field.value}
                        onChange={field.onChange}
                        placeholder="Select employees..."
                    />
                    <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Due Date</FormLabel>
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
                          if(date) field.onChange(date);
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
        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
          <Button type="submit" form="add-reminder-form">Add Reminder</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
