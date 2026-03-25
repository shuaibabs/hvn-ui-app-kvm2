
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
import { useEffect } from 'react';

const formSchema = z.object({
  uploadStatus: z.enum(['Pending', 'Done']),
});

type EditUploadStatusModalProps = {
  isOpen: boolean;
  onClose: () => void;
  number: NumberRecord;
};

export function EditUploadStatusModal({ isOpen, onClose, number }: EditUploadStatusModalProps) {
  const { updateUploadStatus } = useApp();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      uploadStatus: number.uploadStatus,
    },
  });

  useEffect(() => {
    if (number) {
        form.reset({
            uploadStatus: number.uploadStatus,
        })
    }
  }, [number, form]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    updateUploadStatus(number.id, values.uploadStatus);
    onClose();
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Update Upload Status</DialogTitle>
          <DialogDescription>
            Update the upload status for mobile number <span className="font-semibold">{number.mobile}</span>.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} id="edit-upload-form" className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="uploadStatus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Upload Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Done">Done</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" form="edit-upload-form">Save changes</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
