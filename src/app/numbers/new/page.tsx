

'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useApp } from '@/context/app-context';
import { NewNumberData } from '@/lib/data';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Save } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useState } from 'react';
import { useNavigation } from '@/context/navigation-context';
import { AddNumbersReviewModal } from '@/components/add-numbers-review-modal';


const formSchema = z.object({
  mobile: z.string().min(10, 'At least one 10-digit mobile number is required.'),
  numberType: z.enum(['Prepaid', 'Postpaid', 'COCP']),
  purchaseFrom: z.string().min(1, 'Purchase from is required.'),
  purchasePrice: z.coerce.number().min(0, 'Purchase price cannot be negative.'),
  salePrice: z.coerce.number().min(0, 'Sale price cannot be negative.').optional(),
  purchaseDate: z.date({ required_error: 'Purchase date is required.' }),
  currentLocation: z.string().min(1, 'Current location is required.'),
  locationType: z.enum(['Store', 'Employee', 'Dealer']),
  assignedTo: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['RTP', 'Non-RTP']),
  uploadStatus: z.enum(['Pending', 'Done']),
  rtpDate: z.date().optional(),
  safeCustodyDate: z.date().optional(),
  accountName: z.string().optional(),
  ownershipType: z.enum(['Individual', 'Partnership']),
  partnerName: z.string().optional(),
  billDate: z.date().optional(),
  pdBill: z.enum(['Yes', 'No']).default('No'),
}).refine(data => {
  if (data.status === 'Non-RTP') {
    return !!data.rtpDate;
  }
  return true;
}, {
  message: 'RTP Date is required for Non-RTP status.',
  path: ['rtpDate'],
}).refine(data => {
  if (data.numberType === 'COCP') {
    return !!data.safeCustodyDate;
  }
  return true;
}, {
  message: 'Safe Custody Date is required for COCP numbers.',
  path: ['safeCustodyDate'],
}).refine(data => {
  if (data.numberType === 'COCP') {
    return !!data.accountName && data.accountName.length > 0;
  }
  return true;
}, {
  message: 'Account Name is required for COCP numbers.',
  path: ['accountName'],
}).refine(data => {
  if (data.ownershipType === 'Partnership') {
    return !!data.partnerName && data.partnerName.length > 0;
  }
  return true;
}, {
  message: 'Partner Name is required for Partnership ownership.',
  path: ['partnerName'],
}).refine(data => {
  if (data.numberType === 'Postpaid') {
    return !!data.billDate;
  }
  return true;
}, {
  message: 'Bill Date is required for Postpaid numbers.',
  path: ['billDate'],
});

export default function NewNumberPage() {
  const { navigate, back } = useNavigation();
  const { employees } = useApp();
  const [isPurchaseDatePickerOpen, setIsPurchaseDatePickerOpen] = useState(false);
  const [isRtpDatePickerOpen, setIsRtpDatePickerOpen] = useState(false);
  const [isSafeCustodyDatePickerOpen, setIsSafeCustodyDatePickerOpen] = useState(false);
  const [isBillDatePickerOpen, setIsBillDatePickerOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [formData, setFormData] = useState<NewNumberData | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      mobile: '',
      numberType: 'Prepaid',
      purchaseFrom: '',
      purchasePrice: 0,
      salePrice: 0,
      purchaseDate: new Date(),
      currentLocation: '',
      locationType: 'Store',
      notes: '',
      status: 'Non-RTP',
      uploadStatus: 'Pending',
      accountName: '',
      ownershipType: 'Individual',
      partnerName: '',
      pdBill: 'No',
      assignedTo: '',
    },
  });

  function onReview(values: z.infer<typeof formSchema>) {
    setFormData(values as NewNumberData);
    setIsReviewModalOpen(true);
  }

  const numberType = form.watch('numberType');
  const ownershipType = form.watch('ownershipType');

  return (
    <>
      <PageHeader
        title="Add New Number(s)"
        description="Manually add one or more numbers to the master inventory."
      >
        <Button variant="outline" onClick={() => back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Cancel
        </Button>
      </PageHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onReview)} className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Number Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="mobile"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mobile Number(s)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter one or more 10-digit mobile numbers, separated by commas or newlines."
                        className="min-h-[120px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="numberType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Number Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select number type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Prepaid">Prepaid</SelectItem>
                        <SelectItem value="Postpaid">Postpaid</SelectItem>
                        <SelectItem value="COCP">COCP</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {numberType === 'COCP' && (
                <FormField
                  control={form.control}
                  name="accountName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter account name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Purchase &amp; Sale Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="purchaseFrom"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Purchased From (Vendor)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Vendor A" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="purchaseDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Purchase Date</FormLabel>
                      <Popover open={isPurchaseDatePickerOpen} onOpenChange={setIsPurchaseDatePickerOpen}>
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
                              if (date) field.onChange(date);
                              setIsPurchaseDatePickerOpen(false);
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="purchasePrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Purchase Price (₹)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="100" {...field} />
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
                      <FormLabel>Intended Sale Price (₹)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="Optional" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ownership Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="ownershipType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ownership Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select ownership type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Individual">Individual</SelectItem>
                          <SelectItem value="Partnership">Partnership</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {ownershipType === 'Partnership' && (
                  <FormField
                    control={form.control}
                    name="partnerName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Partner Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter partner's name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            </CardContent>
          </Card>


          <Card>
            <CardHeader>
              <CardTitle>Status & Location</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>RTP Status</FormLabel>
                      <Select onValueChange={(value) => {
                        field.onChange(value);
                        if (value === 'RTP') {
                          form.setValue('rtpDate', undefined);
                          form.clearErrors('rtpDate');
                        }
                      }} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="RTP">RTP</SelectItem>
                          <SelectItem value="Non-RTP">Non-RTP</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {form.watch('status') === 'Non-RTP' && (
                  <FormField
                    control={form.control}
                    name="rtpDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Schedule RTP Date</FormLabel>
                        <Popover open={isRtpDatePickerOpen} onOpenChange={setIsRtpDatePickerOpen}>
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
                                if (date) field.onChange(date);
                                setIsRtpDatePickerOpen(false);
                              }}
                              disabled={(date) => date < new Date() || date < new Date("1900-01-01")}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                <FormField
                  control={form.control}
                  name="uploadStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Upload Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select an upload status" />
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
              </div>
              {numberType === 'COCP' && (
                <FormField
                  control={form.control}
                  name="safeCustodyDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Safe Custody Date</FormLabel>
                      <Popover open={isSafeCustodyDatePickerOpen} onOpenChange={setIsSafeCustodyDatePickerOpen}>
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
                              if (date) field.onChange(date);
                              setIsSafeCustodyDatePickerOpen(false);
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              {numberType === 'Postpaid' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="billDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Bill Date</FormLabel>
                        <Popover open={isBillDatePickerOpen} onOpenChange={setIsBillDatePickerOpen}>
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
                                if (date) field.onChange(date);
                                setIsBillDatePickerOpen(false);
                              }}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="pdBill"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>PD Bill</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="No">No</SelectItem>
                            <SelectItem value="Yes">Yes</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="currentLocation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Location</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Mumbai Store" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="locationType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
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
              </div>
              <FormField
                control={form.control}
                name="assignedTo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assign To (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Leave unassigned or select employee" />
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Any other relevant details about this number..."
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => navigate('/numbers')}>Cancel</Button>
            <Button type="submit">
              <Save className="mr-2 h-4 w-4" /> Review & Save
            </Button>
          </div>
        </form>
      </Form>
      {formData && (
        <AddNumbersReviewModal
          isOpen={isReviewModalOpen}
          onClose={() => setIsReviewModalOpen(false)}
          formData={formData}
        />
      )}
    </>
  );
}
