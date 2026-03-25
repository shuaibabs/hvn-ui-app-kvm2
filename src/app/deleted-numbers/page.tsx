
"use client";

import { useState, useMemo } from 'react';
import { useApp } from '@/context/app-context';
import { PageHeader } from '@/components/page-header';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Search, History, RotateCcw } from 'lucide-react';
import { Pagination } from '@/components/pagination';
import { TableSpinner } from '@/components/ui/spinner';
import { format } from 'date-fns';
import { LifecycleHistoryModal } from '@/components/lifecycle-history-modal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DeletedNumberRecord } from '@/lib/data';

const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50, 100, 250, 500, 1000, 5000];

export default function DeletedNumbersPage() {
  const { deletedNumbers, loading, restoreDeletedNumber } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [selectedMobile, setSelectedMobile] = useState<string | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [numberToRestore, setNumberToRestore] = useState<DeletedNumberRecord | null>(null);

  const filteredHistory = useMemo(() => {
    return (deletedNumbers || []).filter(record => 
      record.mobile && record.mobile.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [deletedNumbers, searchTerm]);

  const totalPages = Math.ceil(filteredHistory.length / itemsPerPage);
  const paginatedHistory = filteredHistory.slice(
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

  const handleHistoryClick = (mobile: string) => {
    setSelectedMobile(mobile);
    setIsHistoryModalOpen(true);
  };

  const handleRestoreClick = (record: DeletedNumberRecord) => {
    setNumberToRestore(record);
  };

  const handleConfirmRestore = () => {
    if (numberToRestore) {
        restoreDeletedNumber(numberToRestore.id);
        setNumberToRestore(null);
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
  
  return (
    <>
      <PageHeader
        title="Deleted Numbers"
        description="An archive of all numbers that have been deleted from the system."
      />
       <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-4 flex-wrap">
             <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Search by mobile number..."
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
          </div>
        </div>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
                <TableHead>Phone Number</TableHead>
                <TableHead>Deletion Reason</TableHead>
                <TableHead>Deleted By</TableHead>
                <TableHead>Deletion Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
                <TableSpinner colSpan={5} />
            ) : paginatedHistory.length > 0 ? (
                paginatedHistory.map((record) => (
                <TableRow key={record.id}>
                    <TableCell className="font-medium">{highlightMatch(record.mobile, searchTerm)}</TableCell>
                    <TableCell>{record.deletionReason}</TableCell>
                    <TableCell>{record.deletedBy}</TableCell>
                    <TableCell>{format(record.deletedAt.toDate(), 'PPP p')}</TableCell>
                    <TableCell className="text-right space-x-2">
                        <Button variant="ghost" size="icon" onClick={() => handleHistoryClick(record.mobile)}>
                            <History className="h-4 w-4" />
                            <span className="sr-only">View History</span>
                        </Button>
                         <Button variant="outline" size="sm" onClick={() => handleRestoreClick(record)}>
                            <RotateCcw className="mr-2 h-4 w-4" />
                            Restore
                        </Button>
                    </TableCell>
                </TableRow>
                ))
            ) : (
                <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                        {searchTerm ? `No deleted numbers found for "${searchTerm}".` : "No numbers have been deleted yet."}
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
        totalItems={filteredHistory.length}
      />
      {selectedMobile && (
        <LifecycleHistoryModal 
            isOpen={isHistoryModalOpen}
            onClose={() => setIsHistoryModalOpen(false)}
            mobileNumber={selectedMobile}
        />
      )}
       <AlertDialog open={!!numberToRestore} onOpenChange={() => setNumberToRestore(null)}>
            <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure you want to restore this number?</AlertDialogTitle>
                <AlertDialogDescription>
                This will move the number <span className="font-semibold">{numberToRestore?.mobile}</span> back to the main inventory.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setNumberToRestore(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmRestore}>
                Yes, Restore
                </AlertDialogAction>
            </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </>
  );
}
