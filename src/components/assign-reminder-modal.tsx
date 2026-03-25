
"use client";

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormField } from '@/components/ui/form';
import { useApp } from '@/context/app-context';
import type { Reminder } from '@/lib/data';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import React, { useMemo } from 'react';
import { MultiSelect } from './ui/multi-select';

const formSchema = z.object({
  assignedTo: z.array(z.string()),
});

type AssignReminderModalProps = {
  isOpen: boolean;
  onClose: () => void;
  selectedReminders: Reminder[];
};

export function AssignReminderModal({ isOpen, onClose, selectedReminders }: AssignReminderModalProps) {
  const { assignRemindersToUsers, users } = useApp();

  const employeeOptions = useMemo(() => {
    return users.map(u => ({ label: u.displayName, value: u.displayName }));
  }, [users]);
  
  const initialAssignees = useMemo(() => {
    if (selectedReminders.length === 1) {
        return selectedReminders[0].assignedTo;
    }
    return [];
  }, [selectedReminders]);


  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        assignedTo: initialAssignees
    }
  });

  React.useEffect(() => {
    if (isOpen) {
      form.reset({ assignedTo: initialAssignees });
    }
  }, [isOpen, initialAssignees, form]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    const reminderIds = selectedReminders.map(r => r.id);
    assignRemindersToUsers(reminderIds, values.assignedTo);
    onClose();
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Reminders</DialogTitle>
          <DialogDescription>
            Assign the selected {selectedReminders.length} reminder(s) to employees.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
            <div>
                <p className="text-sm font-medium mb-2">Selected Reminders:</p>
                <ScrollArea className="h-24 w-full rounded-md border p-2">
                    <div className="flex flex-wrap gap-2">
                        {selectedReminders.map(rem => (
                            <Badge key={rem.id} variant="secondary">{rem.taskName}</Badge>
                        ))}
                    </div>
                </ScrollArea>
            </div>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} id="assign-reminder-form" className="space-y-4">
                <FormField
                  control={form.control}
                  name="assignedTo"
                  render={({ field }) => (
                     <MultiSelect
                        options={employeeOptions}
                        selected={field.value}
                        onChange={field.onChange}
                        placeholder="Select employees..."
                    />
                  )}
                />
              </form>
            </Form>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="assign-reminder-form">Assign</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
