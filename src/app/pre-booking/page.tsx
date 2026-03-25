

"use client";

import { useState, useMemo } from 'react';
import { useApp } from '@/context/app-context';
import { PageHeader } from '@/components/page-header';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Download, Search, Trash, MoreHorizontal, DollarSign } from 'lucide-react';
import { Pagination } from '@/components/pagination';
import { TableSpinner } from '@/components/ui/spinner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PreBookingRecord, NumberRecord } from '@/lib/data';
import { format } from 'date-fns';
import Papa from 'papaparse';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { Input } from '@/components/ui/input';
import { SellNumberModal } from '@/components/sell-number-modal';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { BulkSellNumberModal } from '@/components/bulk-sell-modal';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';


const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50, 100, 250, 500, 1000, 5000];

export default function PreBookingPage() {
  const { preBookings, loading, addActivity, cancelPreBooking, sellPreBookedNumber } = useApp();
  const { role, user } = useAuth();
  const { toast } = useToast();
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [isSellModalOpen, setIsSellModalOpen] = useState(false);
  const [isBulkSellModalOpen, setIsBulkSellModalOpen] = useState(false);
  const [selectedPreBooking, setSelectedPreBooking] = useState<PreBookingRecord | null>(null);
  const [preBookingToCancel, setPreBookingToCancel] = useState<PreBookingRecord | null>(null);

  const sortedAndFilteredPreBookings = useMemo(() => {
    let filtered = preBookings.filter(pb => 
      (pb.mobile && pb.mobile.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    
    // Sort by RTP status first, then by pre-booking date
    filtered.sort((a, b) => {
        const aIsRtp = a.originalNumberData?.status === 'RTP';
        const bIsRtp = b.originalNumberData?.status === 'RTP';
        
        if (aIsRtp && !bIsRtp) return -1;
        if (!aIsRtp && bIsRtp) return 1;

        return b.preBookingDate.toDate().getTime() - a.preBookingDate.toDate().getTime();
    });

    return filtered;
  }, [preBookings, searchTerm]);

  const totalPages = Math.ceil(sortedAndFilteredPreBookings.length / itemsPerPage);
  const paginatedPreBookings = sortedAndFilteredPreBookings.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
  );
  
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };
  
  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1);
  };
  
  const handleSelectRow = (id: string) => {
    setSelectedRows(prev => 
      prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]
    );
  };

  const handleSelectAllOnPage = (checked: boolean | 'indeterminate') => {
    const pageIds = paginatedPreBookings.map(s => s.id);
    if (checked) {
      setSelectedRows(prev => [...new Set([...prev, ...pageIds])]);
    } else {
      setSelectedRows(prev => prev.filter(id => !pageIds.includes(id)));
    }
  };

  const isAllOnPageSelected = paginatedPreBookings.length > 0 && paginatedPreBookings.every(s => selectedRows.includes(s.id));

  const handleSellClick = (preBooking: PreBookingRecord) => {
    setSelectedPreBooking(preBooking);
    setIsSellModalOpen(true);
  };

  const handleCancelClick = (preBooking: PreBookingRecord) => {
    setPreBookingToCancel(preBooking);
  };

  const handleConfirmCancel = () => {
    if (preBookingToCancel) {
      cancelPreBooking(preBookingToCancel.id);
      setPreBookingToCancel(null);
    }
  };

  const highlightMatch = (text: string, highlight: string) => {
    if (!highlight.trim()) {
      return <span>{text}</span>;
    }
    const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) =>
          part.toLowerCase() === highlight.toLowerCase() ? (
            <span key={i} className="bg-yellow-300 dark:bg-yellow-700 rounded-sm">
              {part}
            </span>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  const selectedPreBookingRecords = preBookings.filter(p => selectedRows.includes(p.id));

  const selectedNumberRecordsForSelling = selectedPreBookingRecords.map(pb => ({
      ...pb.originalNumberData,
      id: pb.id, // We need the prebooking doc ID to delete it later
  })) as unknown as NumberRecord[];
  
  const handleSellPreBooked = (details: { salePrice: number; soldTo: string; saleDate: Date }) => {
    if(!selectedPreBooking) return;
    sellPreBookedNumber(selectedPreBooking.id, details);
    setIsSellModalOpen(false);
  }

  return (
    <>
      <PageHeader
        title="Pre-Booked Numbers"
        description="View and manage all numbers that have been reserved for customers."
      />
       <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
          <div className="flex items-center gap-4 flex-wrap">
             <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Search by mobile..."
                    value={searchTerm}
                    onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setCurrentPage(1);
                    }}
                    className="pl-9 max-w-full sm:max-w-xs"
                />
            </div>
             <Select value={String(itemsPerPage)} onValueChange={handleItemsPerPageChange}>
              <SelectTrigger className="w-full sm:w-[120px]">
                <SelectValue placeholder="Items per page" />
              </SelectTrigger>
              <SelectContent>
                {ITEMS_PER_PAGE_OPTIONS.map(val => (
                   <SelectItem key={val} value={String(val)}>{val} / page</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedRows.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                     <Button onClick={() => setIsBulkSellModalOpen(true)} className="bg-green-600 hover:bg-green-700 text-white">
                        <DollarSign className="mr-2 h-4 w-4" />
                        Mark as Sold ({selectedRows.length})
                    </Button>
                </div>
            )}
          </div>
        </div>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                    checked={isAllOnPageSelected}
                    onCheckedChange={handleSelectAllOnPage}
                    aria-label="Select all on this page"
                />
              </TableHead>
              <TableHead>Sr.No</TableHead>
              <TableHead>Mobile</TableHead>
              <TableHead>Sum</TableHead>
              <TableHead>Purchase Price</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Pre-Booking Date</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
                <TableSpinner colSpan={9} />
            ) : paginatedPreBookings.length > 0 ? (
                paginatedPreBookings.map((pb) => {
                    const isRtp = pb.originalNumberData?.status === 'RTP';
                    return (
                        <TableRow 
                            key={pb.id} 
                            data-state={selectedRows.includes(pb.id) && "selected"}
                            className={cn(isRtp && "bg-amber-100 dark:bg-amber-900/30 hover:bg-amber-100/80 dark:hover:bg-amber-900/40 data-[state=selected]:bg-amber-200 dark:data-[state=selected]:bg-amber-900/50")}
                        >
                            <TableCell>
                                <Checkbox
                                    checked={selectedRows.includes(pb.id)}
                                    onCheckedChange={() => handleSelectRow(pb.id)}
                                    aria-label="Select row"
                                />
                            </TableCell>
                            <TableCell>{pb.srNo}</TableCell>
                            <TableCell className="font-medium">{highlightMatch(pb.mobile, searchTerm)}</TableCell>
                            <TableCell>{pb.sum}</TableCell>
                            <TableCell>₹{pb.originalNumberData?.purchasePrice.toLocaleString() || 'N/A'}</TableCell>
                            <TableCell>
                              <Badge variant={pb.originalNumberData?.status === 'RTP' ? 'default' : 'destructive'} className={pb.originalNumberData?.status === 'RTP' ? `bg-green-500/20 text-green-700` : `bg-red-500/20 text-red-700`}>{pb.originalNumberData?.status}</Badge>
                            </TableCell>
                            <TableCell>{format(pb.preBookingDate.toDate(), 'PPP')}</TableCell>
                            <TableCell>{pb.originalNumberData?.assignedTo || 'N/A'}</TableCell>
                            <TableCell className="text-right">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                        <span className="sr-only">Open menu</span>
                                        <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => handleSellClick(pb)} className="text-green-600 focus:text-green-700">
                                            <DollarSign className="mr-2 h-4 w-4" />
                                            Mark as Sold
                                        </DropdownMenuItem>
                                        <DropdownMenuItem 
                                          onClick={() => handleCancelClick(pb)}
                                          className="text-destructive focus:text-destructive"
                                        >
                                            <Trash className="mr-2 h-4 w-4" />
                                            Cancel Pre-Booking
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    )
                })
            ) : (
                <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center">
                        {searchTerm ? `No pre-booked numbers found for "${searchTerm}".` : "No pre-booked numbers found."}
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        itemsPerPage={itemsPerPage}
        totalItems={sortedAndFilteredPreBookings.length}
      />
       {selectedPreBooking && (
            <SellNumberModal 
                isOpen={isSellModalOpen}
                onClose={() => setIsSellModalOpen(false)}
                number={{...selectedPreBooking.originalNumberData, id: selectedPreBooking.id} as unknown as NumberRecord}
                onSell={handleSellPreBooked}
            />
       )}
        <BulkSellNumberModal
            isOpen={isBulkSellModalOpen}
            onClose={() => setIsBulkSellModalOpen(false)}
            selectedNumbers={selectedNumberRecordsForSelling}
            isPreBooking={true}
        />
        <AlertDialog open={!!preBookingToCancel} onOpenChange={() => setPreBookingToCancel(null)}>
            <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                This will cancel the pre-booking for <span className="font-semibold">{preBookingToCancel?.mobile}</span>. The number will be returned to the master inventory. This action cannot be undone.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setPreBookingToCancel(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmCancel} className="bg-destructive hover:bg-destructive/90">
                Yes, cancel pre-booking
                </AlertDialogAction>
            </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </>
  );
}
