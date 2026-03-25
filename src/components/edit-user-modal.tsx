

"use client";

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useApp } from '@/context/app-context';
import { User } from '@/lib/data';
import { Send } from 'lucide-react';

const formSchema = z.object({
  displayName: z.string().min(2, 'Name must be at least 2 characters.'),
  telegramUsername: z.string().optional(),
});

type EditUserModalProps = {
  isOpen: boolean;
  onClose: () => void;
  user: User;
};

export function EditUserModal({ isOpen, onClose, user }: EditUserModalProps) {
  const { updateUser } = useApp();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      displayName: user.displayName,
      telegramUsername: user.telegramUsername || '',
    },
  });

  useEffect(() => {
    if (user) {
      form.reset({
        displayName: user.displayName,
        telegramUsername: user.telegramUsername || '',
      });
    }
  }, [user, form]);


  function onSubmit(values: z.infer<typeof formSchema>) {
    updateUser(user.uid, values);
    onClose();
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit User: {user.displayName}</DialogTitle>
          <DialogDescription>
            Update the user's details. Email and role cannot be changed here.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} id="edit-user-form" className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="telegramUsername"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telegram Username (Optional)</FormLabel>
                  <FormControl>
                    <div className="relative">
                        <Send className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="@username" {...field} className="pl-9" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="edit-user-form">Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
