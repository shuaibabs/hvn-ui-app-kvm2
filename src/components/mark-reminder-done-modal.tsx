
"use client";

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useApp } from '@/context/app-context';
import { Reminder } from '@/lib/data';
import { Textarea } from './ui/textarea';

const formSchema = z.object({
  note: z.string().optional(),
});

type MarkReminderDoneModalProps = {
  isOpen: boolean;
  onClose: () => void;
  reminder: Reminder;
};

export function MarkReminderDoneModal({ isOpen, onClose, reminder }: MarkReminderDoneModalProps) {
  const { markReminderDone } = useApp();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      note: '',
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    markReminderDone(reminder.id, values.note);
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
          <DialogTitle>Mark Task as Done</DialogTitle>
          <DialogDescription>
            You are marking the task "{reminder.taskName}" as complete. Add an optional note below.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} id="mark-done-form" className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Completion Note (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., Customer confirmed the issue is resolved."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
          <Button type="submit" form="mark-done-form">Mark as Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
