
"use client";

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useApp } from '@/context/app-context';
import { Reminder } from '@/lib/data';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import React from 'react';
import { Textarea } from './ui/textarea';

const formSchema = z.object({
  note: z.string().optional(),
});

type BulkMarkRemindersDoneModalProps = {
  isOpen: boolean;
  onClose: () => void;
  selectedReminders: Reminder[];
};

export function BulkMarkRemindersDoneModal({ isOpen, onClose, selectedReminders }: BulkMarkRemindersDoneModalProps) {
  const { bulkMarkRemindersDone } = useApp();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      note: '',
    },
  });

  React.useEffect(() => {
    if (isOpen) {
      form.reset();
    }
  }, [isOpen, form]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    const reminderIds = selectedReminders.map(r => r.id);
    bulkMarkRemindersDone(reminderIds, values.note);
    onClose();
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Bulk Mark Reminders as Done</DialogTitle>
          <DialogDescription>
            You are marking {selectedReminders.length} reminder(s) as complete. You can add an optional note below which will be applied to all.
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
            <form onSubmit={form.handleSubmit(onSubmit)} id="bulk-mark-done-form" className="space-y-4">
              <FormField
                control={form.control}
                name="note"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Completion Note (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="e.g., All issues resolved."
                        {...field}
                      />
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
          <Button type="submit" form="bulk-mark-done-form">Mark as Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
