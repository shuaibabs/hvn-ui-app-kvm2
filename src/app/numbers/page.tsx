

"use client";

import { useState, useMemo, useEffect } from 'react';
import { useApp } from '@/context/app-context';
import type { NumberRecord } from '@/lib/data';
import { PageHeader } from '@/components/page-header';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, UserPlus, ArrowUpDown, DollarSign, PlusCircle, FileInput, Trash, MapPin, Edit, UploadCloud, ArrowUp, ArrowDown, Bookmark, Copy } from 'lucide-react';
import { format } from 'date-fns';
import { RtpStatusModal } from '@/components/rts-status-modal';
import { Pagination } from '@/components/pagination';
import { Checkbox } from '@/components/ui/checkbox';
import { AssignNumbersModal } from '@/components/assign-numbers-modal';
import { SellNumberModal } from '@/components/sell-number-modal';
import { TableSpinner } from '@/components/ui/spinner';
import { useAuth } from '@/context/auth-context';
import { Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { EditUploadStatusModal } from '@/components/edit-upload-status-modal';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { BulkSellNumberModal } from '@/components/bulk-sell-modal';
import { useNavigation } from '@/context/navigation-context';
import { EditLocationModal } from '@/components/edit-location-modal';
import { BulkEditUploadStatusModal } from '@/components/bulk-edit-upload-status-modal';
import { BulkDeleteNumbersModal } from '@/components/bulk-delete-numbers-modal';
import { cn } from '@/lib/utils';
import { AdvancedSearch, type AdvancedSearchState } from '@/components/advanced-search';
import { BulkUploadStatusChangeModal } from '@/components/bulk-upload-status-change-modal';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type SortableColumn = keyof NumberRecord | 'id' | 'twoDigitSum';

const initialAdvancedSearchState: AdvancedSearchState = {
  startWith: '',
  anywhere: '',
  endWith: '',
  mustContain: '',
  notContain: '',
  onlyContain: '',
  total: '',
  sum: '',
  maxContain: '',
  mostContains: false,
};


export default function AllNumbersPage() {
  const { numbers, loading, isMobileNumberDuplicate, deleteNumbers, markAsPreBooked, recentlyAutoRtpIds } = useApp();
  const { role } = useAuth();
  const { navigate } = useNavigation();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedNumber, setSelectedNumber] = useState<NumberRecord | null>(null);
  const [isRtpModalOpen, setIsRtpModalOpen] = useState(false);
  const [isSellModalOpen, setIsSellModalOpen] = useState(false);
  const [isBulkSellModalOpen, setIsBulkSellModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isBulkUploadModalOpen, setIsBulkUploadModalOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isBulkUploadStatusChangeModalOpen, setIsBulkUploadStatusChangeModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: SortableColumn; direction: 'ascending' | 'descending' } | null>({ key: 'srNo', direction: 'ascending' });
  const [isPreBookConfirmationOpen, setIsPreBookConfirmationOpen] = useState(false);
  const [advancedSearch, setAdvancedSearch] = useState<AdvancedSearchState>(initialAdvancedSearchState);

  const [rowsToDelete, setRowsToDelete] = useState<string[]>([]);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteReasonError, setDeleteReasonError] = useState('');


  const calculateSimpleSum = (mobile: string): number => {
    return mobile
      .split('')
      .map(Number)
      .reduce((acc, digit) => acc + digit, 0);
  };

  const sortedAndFilteredNumbers = useMemo(() => {
    let sortableItems = [...numbers]
      .filter(num =>
        (statusFilter === 'all' || num.status === statusFilter) &&
        (typeFilter === 'all' || num.numberType === typeFilter)
      )
      .filter(num =>
        num.mobile && num.mobile.toLowerCase().includes(searchTerm.toLowerCase())
      );

    // Advanced search filtering
    if (Object.values(advancedSearch).some(v => v)) {
      sortableItems = sortableItems.filter(num => {
        const { startWith, endWith, anywhere, mustContain, notContain, onlyContain, total, sum, maxContain } = advancedSearch;

        if (startWith && !num.mobile.startsWith(startWith)) return false;
        if (endWith && !num.mobile.endsWith(endWith)) return false;
        if (anywhere && !num.mobile.includes(anywhere)) return false;

        if (mustContain) {
          const mustContainDigits = mustContain.split(',').map(d => d.trim()).filter(Boolean);
          if (!mustContainDigits.every(digit => num.mobile.includes(digit))) return false;
        }

        if (notContain) {
          const notContainDigits = notContain.split(',').map(d => d.trim()).filter(Boolean);
          if (notContainDigits.some(digit => num.mobile.includes(digit))) return false;
        }

        if (onlyContain) {
          const allowedDigits = new Set(onlyContain.split(''));
          if (!num.mobile.split('').every(digit => allowedDigits.has(digit))) {
            return false;
          }
        }

        if (total) {
          const digitSum = num.mobile.split('').reduce((acc, digit) => acc + parseInt(digit, 10), 0);
          if (digitSum.toString() !== total) return false;
        }

        if (sum && num.sum.toString() !== sum) return false;

        if (maxContain) {
          const digitCounts = num.mobile.split('').reduce((acc, digit) => {
            acc[digit] = (acc[digit] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);
          if (Math.max(...Object.values(digitCounts)) > parseInt(maxContain, 10)) return false;
        }

        return true;
      });
    }

    // Prioritize recently auto-RTP'd numbers
    sortableItems.sort((a, b) => {
      const aIsRecent = recentlyAutoRtpIds.includes(a.id);
      const bIsRecent = recentlyAutoRtpIds.includes(b.id);
      if (aIsRecent && !bIsRecent) return -1;
      if (!aIsRecent && bIsRecent) return 1;
      return 0;
    });

    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        // Keep recent RTP at top regardless of other sorting
        const aIsRecent = recentlyAutoRtpIds.includes(a.id);
        const bIsRecent = recentlyAutoRtpIds.includes(b.id);
        if (aIsRecent && !bIsRecent) return -1;
        if (!aIsRecent && bIsRecent) return 1;

        const aValue = sortConfig.key === 'twoDigitSum' ? calculateSimpleSum(a.mobile) : a[sortConfig.key as keyof NumberRecord];
        const bValue = sortConfig.key === 'twoDigitSum' ? calculateSimpleSum(b.mobile) : b[sortConfig.key as keyof NumberRecord];


        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;

        let comparison = 0;
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          comparison = aValue.localeCompare(bValue);
        } else if (aValue instanceof Date && bValue instanceof Date) {
          comparison = aValue.getTime() - bValue.getTime();
        } else if (aValue instanceof Timestamp && bValue instanceof Timestamp) {
          comparison = aValue.toMillis() - bValue.toMillis();
        } else {
          if (aValue < bValue) {
            comparison = -1;
          }
          if (aValue > bValue) {
            comparison = 1;
          }
        }

        return sortConfig.direction === 'ascending' ? comparison : -comparison;
      });
    }

    return sortableItems;
  }, [numbers, searchTerm, statusFilter, typeFilter, sortConfig, recentlyAutoRtpIds, advancedSearch]);

  const totalPages = Math.ceil(sortedAndFilteredNumbers.length / itemsPerPage);
  const paginatedNumbers = sortedAndFilteredNumbers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const requestSort = (key: SortableColumn) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
    setCurrentPage(1);
  };

  const getSortIcon = (columnKey: SortableColumn) => {
    if (!sortConfig || sortConfig.key !== columnKey) {
      return <ArrowUpDown className="ml-2 h-4 w-4 opacity-30" />;
    }
    if (sortConfig.direction === 'ascending') {
      return <ArrowUp className="ml-2 h-4 w-4" />;
    }
    return <ArrowDown className="ml-2 h-4 w-4" />;
  };


  const handleMarkRTP = (number: NumberRecord) => {
    setSelectedNumber(number);
    setIsRtpModalOpen(true);
  };

  const handleEditUpload = (number: NumberRecord) => {
    setSelectedNumber(number);
    setIsUploadModalOpen(true);
  };

  const handleSellNumber = (number: NumberRecord) => {
    setSelectedNumber(number);
    setIsSellModalOpen(true);
  };

  const handleEditLocation = (number: NumberRecord) => {
    setSelectedRows([number.id]);
    setIsLocationModalOpen(true);
  }

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
    const pageIds = paginatedNumbers.map(n => n.id);
    if (checked) {
      setSelectedRows(prev => [...new Set([...prev, ...pageIds])]);
    } else {
      setSelectedRows(prev => prev.filter(id => !pageIds.includes(id)));
    }
  };

  const isAllOnPageSelected = paginatedNumbers.length > 0 && paginatedNumbers.every(n => selectedRows.includes(n.id));

  const handleOpenAssignModal = () => {
    setIsAssignModalOpen(true);
  }

  const closeAssignModal = () => {
    setIsAssignModalOpen(false);
    setSelectedRows([]);
  }

  const handleOpenBulkSellModal = () => {
    setIsBulkSellModalOpen(true);
  };

  const closeBulkSellModal = () => {
    setIsBulkSellModalOpen(false);
    setSelectedRows([]);
  };

  const closeBulkUploadModal = () => {
    setIsBulkUploadModalOpen(false);
    setSelectedRows([]);
  }

  const closeLocationModal = () => {
    setIsLocationModalOpen(false);
    setSelectedRows([]);
  }

  const openDeleteModal = (numberIds: string[]) => {
    if (numberIds.length === 0) return;
    setRowsToDelete(numberIds);
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setRowsToDelete([]);
    setDeleteReason('');
    setDeleteReasonError('');
  }

  const handleConfirmDelete = () => {
    if (!deleteReason.trim()) {
      setDeleteReasonError('A reason for deletion is required.');
      return;
    }
    deleteNumbers(rowsToDelete, deleteReason);
    setSelectedRows(prev => prev.filter(id => !rowsToDelete.includes(id)));
    closeDeleteModal();
  };

  const selectedNumberRecords = numbers.filter(n => selectedRows.includes(n.id));

  const handleCopySelected = () => {
    if (selectedNumberRecords.length === 0) return;

    // Define column widths
    const w = { mob: 12, s: 5, ds: 13, st: 8, d: 12, p: 6 };

    // Create Header
    const h = [
      "Mobile".padEnd(w.mob),
      "Sum".padEnd(w.s),
      "2-Digit Sum".padEnd(w.ds),
      "Status".padEnd(w.st),
      "RTP Date".padEnd(w.d),
      "Price".padEnd(w.p)
    ].join(' | ');

    const separator = "-".repeat(h.length);

    // Create Rows
    const rows = selectedNumberRecords.map(num => {
      const twoDigitSum = calculateSimpleSum(num.mobile);
      const rtpDate = num.rtpDate ? format(num.rtpDate.toDate(), 'yyyy-MM-dd') : 'N/A';

      return [
        String(num.mobile).padEnd(w.mob),
        String(num.sum).padEnd(w.s),
        String(twoDigitSum).padEnd(w.ds),
        String(num.status).padEnd(w.st),
        String(rtpDate).padEnd(w.d),
        String(num.salePrice).padEnd(w.p)
      ].join(' | ');
    });

    const textToCopy = [h, separator, ...rows].join('\n');

    navigator.clipboard.writeText(textToCopy).then(() => {
      toast({ title: "Copied to clipboard!" });
    });
  };

  const SortableHeader = ({ column, label }: { column: SortableColumn, label: string }) => (
    <TableHead>
      <Button variant="ghost" onClick={() => requestSort(column)} className="px-0 hover:bg-transparent">
        {label}
        {getSortIcon(column)}
      </Button>
    </TableHead>
  );

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

  const handleAddFromSearch = () => {
    const trimmedSearch = searchTerm.trim();
    if (!/^\d{10}$/.test(trimmedSearch)) {
      toast({
        variant: 'destructive',
        title: 'Invalid Number',
        description: 'Mobile number must be exactly 10 digits.',
      });
      return;
    }
    if (isMobileNumberDuplicate(trimmedSearch)) {
      toast({
        variant: 'destructive',
        title: 'Duplicate Number',
        description: 'This mobile number already exists in the system.',
      });
      return;
    }
    navigate(`/numbers/new?mobile=${trimmedSearch}`);
  };

  const handlePreBook = (number: NumberRecord) => {
    setSelectedRows([number.id]);
    setIsPreBookConfirmationOpen(true);
  }

  const handleConfirmPreBook = () => {
    markAsPreBooked(selectedRows);
    setIsPreBookConfirmationOpen(false);
    setSelectedRows([]);
  }

  const handleRowClick = (e: React.MouseEvent, numId: string) => {
    const target = e.target as HTMLElement;
    // Prevent navigation if the click was on a checkbox or inside a dropdown menu button
    if (target.closest('[role="checkbox"]') || target.closest('[data-radix-dropdown-menu-trigger]')) {
      return;
    }
    navigate(`/numbers/${numId}`);
  };

  return (
    <>
      <PageHeader
        title="All Numbers (Master Inventory)"
        description="Search, filter, and manage all numbers in the system."
      >
        <div className="flex flex-col sm:flex-row items-center gap-2">
          <Button onClick={() => navigate('/numbers/new')} className="w-full sm:w-auto">
            <PlusCircle className="mr-2 h-4 w-4" />
            New Number
          </Button>
          <Button variant="outline" onClick={() => navigate('/import-export')} className="w-full sm:w-auto">
            <FileInput className="mr-2 h-4 w-4" />
            Import / Export
          </Button>
          <Button variant="outline" onClick={() => setIsBulkUploadStatusChangeModalOpen(true)} className="w-full sm:w-auto">
            <UploadCloud className="mr-2 h-4 w-4" />
            Bulk Upload Status
          </Button>
          {role === 'admin' && (
            <Button variant="destructive" onClick={() => setIsBulkDeleteModalOpen(true)} className="w-full sm:w-auto">
              <Trash className="mr-2 h-4 w-4" />
              Bulk Delete
            </Button>
          )}
        </div>
      </PageHeader>
      <AdvancedSearch
        onSearchChange={setAdvancedSearch}
        initialState={initialAdvancedSearchState}
        onClear={() => setAdvancedSearch(initialAdvancedSearchState)}
      />
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-4 flex-wrap w-full">
            <Input
              placeholder="Search by mobile number..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="max-w-full sm:max-w-sm"
            />
            <Select value={statusFilter} onValueChange={(value) => {
              setStatusFilter(value);
              setCurrentPage(1);
            }}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="RTP">RTP</SelectItem>
                <SelectItem value="Non-RTP">Non-RTP</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={(value) => {
              setTypeFilter(value);
              setCurrentPage(1);
            }}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="Prepaid">Prepaid</SelectItem>
                <SelectItem value="Postpaid">Postpaid</SelectItem>
                <SelectItem value="COCP">COCP</SelectItem>
              </SelectContent>
            </Select>
            <Select value={String(itemsPerPage)} onValueChange={handleItemsPerPageChange}>
              <SelectTrigger className="w-full sm:w-[120px]">
                <SelectValue placeholder="Items per page" />
              </SelectTrigger>
              <SelectContent>
                {[10, 25, 50, 100, 250, 500, 1000, 5000].map(val => (
                  <SelectItem key={val} value={String(val)}>{val} / page</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {selectedRows.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            {role === 'admin' && (
              <Button variant="destructive" onClick={() => openDeleteModal(selectedRows)}>
                <Trash className="mr-2 h-4 w-4" />
                Delete ({selectedRows.length})
              </Button>
            )}
            {role === 'admin' && (
              <Button onClick={handleOpenAssignModal}>
                <UserPlus className="mr-2 h-4 w-4" />
                Assign ({selectedRows.length})
              </Button>
            )}
            <Button onClick={handleCopySelected} variant="outline">
              <Copy className="mr-2 h-4 w-4" />
              Copy ({selectedRows.length})
            </Button>
            <Button onClick={() => setIsBulkUploadModalOpen(true)} variant="outline">
              <UploadCloud className="mr-2 h-4 w-4" />
              Edit Upload Status ({selectedRows.length})
            </Button>
            <Button onClick={() => setIsPreBookConfirmationOpen(true)} variant="outline">
              <Bookmark className="mr-2 h-4 w-4" />
              Pre-Book ({selectedRows.length})
            </Button>
            <Button onClick={handleOpenBulkSellModal} className="bg-green-600 hover:bg-green-700 text-white">
              <DollarSign className="mr-2 h-4 w-4" />
              Sell ({selectedRows.length})
            </Button>
          </div>
        )}
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
                <SortableHeader column="srNo" label="Sr.No" />
                <SortableHeader column="mobile" label="Mobile" />
                <SortableHeader column="sum" label="Sum" />
                <SortableHeader column="twoDigitSum" label="2-Digit Sum" />
                <SortableHeader column="purchasePrice" label="Purchase Price" />
                <SortableHeader column="numberType" label="Number Type" />
                <SortableHeader column="ownershipType" label="Ownership Type" />
                <SortableHeader column="partnerName" label="Partner Name" />
                <SortableHeader column="uploadStatus" label="Upload Status" />
                <SortableHeader column="assignedTo" label="Assigned To" />
                <SortableHeader column="locationType" label="Location Type" />
                <SortableHeader column="currentLocation" label="Current Location" />
                <SortableHeader column="status" label="Status" />
                <SortableHeader column="purchaseFrom" label="Purchase From" />
                <SortableHeader column="rtpDate" label="RTP Date" />
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableSpinner colSpan={17} />
              ) : paginatedNumbers.length > 0 ? (
                paginatedNumbers.map((num) => (
                  <TableRow
                    key={num.id}
                    data-state={selectedRows.includes(num.id) && "selected"}
                    className={cn(
                      "cursor-pointer",
                      recentlyAutoRtpIds.includes(num.id) && "bg-amber-100 dark:bg-amber-900/30 hover:bg-amber-100/80 dark:hover:bg-amber-900/40 data-[state=selected]:bg-amber-200 dark:data-[state=selected]:bg-amber-900/50"
                    )}
                    onClick={(e) => handleRowClick(e, num.id)}
                  >
                    <TableCell>
                      {num.id && (
                        <Checkbox
                          checked={selectedRows.includes(num.id)}
                          onCheckedChange={() => handleSelectRow(num.id)}
                          aria-label="Select row"
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      {num.srNo}
                    </TableCell>
                    <TableCell className="font-medium">{highlightMatch(num.mobile, searchTerm)}</TableCell>
                    <TableCell>{num.sum}</TableCell>
                    <TableCell>{calculateSimpleSum(num.mobile)}</TableCell>
                    <TableCell>₹{num.purchasePrice.toLocaleString()}</TableCell>
                    <TableCell>{num.numberType}</TableCell>
                    <TableCell>{num.ownershipType}</TableCell>
                    <TableCell>{num.partnerName || 'N/A'}</TableCell>
                    <TableCell>
                      <Badge variant={num.uploadStatus === 'Done' ? 'secondary' : 'outline'}>
                        {num.uploadStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>{num.assignedTo}</TableCell>
                    <TableCell>{num.locationType}</TableCell>
                    <TableCell>{num.currentLocation}</TableCell>
                    <TableCell>
                      <Badge variant={num.status === 'RTP' ? 'default' : 'destructive'} className={num.status === 'RTP' ? `bg-green-500/20 text-green-700 hover:bg-green-500/30` : `bg-red-500/20 text-red-700 hover:bg-red-500/30`}>{num.status}</Badge>
                    </TableCell>
                    <TableCell>{num.purchaseFrom}</TableCell>
                    <TableCell>{num.rtpDate ? format(num.rtpDate.toDate(), 'PPP') : 'N/A'}</TableCell>
                    <TableCell className="text-right">
                      {(role === 'admin' || role === 'employee') && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/numbers/${num.id}`)}>View Details</DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleMarkRTP(num); }}>Update RTP Status</DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEditUpload(num); }}>Edit Upload Status</DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEditLocation(num); }}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Location
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handlePreBook(num); }}>
                              <Bookmark className="mr-2 h-4 w-4" />
                              Pre-Book Number
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-green-600 focus:text-green-700" onClick={(e) => { e.stopPropagation(); handleSellNumber(num); }}>
                              <DollarSign className="mr-2 h-4 w-4" />
                              Mark as Sold
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={(e) => { e.stopPropagation(); openDeleteModal([num.id]); }}>
                              <Trash className="mr-2 h-4 w-4" />
                              Delete Number
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={17} className="h-24 text-center">
                    {searchTerm && `No number found for "${searchTerm}".`}
                    {!searchTerm && "No numbers found for the current filters."}
                    {searchTerm && (
                      <Button
                        variant="link"
                        onClick={handleAddFromSearch}
                      >
                        Add this number
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} itemsPerPage={itemsPerPage} totalItems={sortedAndFilteredNumbers.length} />

      </div>
      {selectedNumber && (
        <RtpStatusModal
          isOpen={isRtpModalOpen}
          onClose={() => setIsRtpModalOpen(false)}
          number={selectedNumber}
        />
      )}
      {selectedNumber && (
        <EditUploadStatusModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          number={selectedNumber}
        />
      )}
      {selectedNumber && (
        <SellNumberModal
          isOpen={isSellModalOpen}
          onClose={() => setIsSellModalOpen(false)}
          number={selectedNumber}
        />
      )}
      <BulkSellNumberModal
        isOpen={isBulkSellModalOpen}
        onClose={closeBulkSellModal}
        selectedNumbers={selectedNumberRecords}
      />
      <BulkEditUploadStatusModal
        isOpen={isBulkUploadModalOpen}
        onClose={closeBulkUploadModal}
        selectedNumbers={selectedNumberRecords}
      />
      <EditLocationModal
        isOpen={isLocationModalOpen}
        onClose={closeLocationModal}
        selectedNumbers={selectedNumberRecords}
      />
      <BulkDeleteNumbersModal
        isOpen={isBulkDeleteModalOpen}
        onClose={() => setIsBulkDeleteModalOpen(false)}
      />
      <BulkUploadStatusChangeModal
        isOpen={isBulkUploadStatusChangeModalOpen}
        onClose={() => setIsBulkUploadStatusChangeModalOpen(false)}
      />
      {role === 'admin' && (
        <AssignNumbersModal
          isOpen={isAssignModalOpen}
          onClose={closeAssignModal}
          selectedNumbers={selectedNumberRecords}
        />
      )}
      <AlertDialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will move {rowsToDelete.length} number record(s) to the Deleted Numbers archive. Please provide a reason.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4 space-y-2">
            <Label htmlFor="delete-reason" className={deleteReasonError ? 'text-destructive' : ''}>Reason for Deletion (Required)</Label>
            <Textarea
              id="delete-reason"
              value={deleteReason}
              onChange={(e) => {
                setDeleteReason(e.target.value);
                if (e.target.value.trim()) setDeleteReasonError('');
              }}
              placeholder="e.g. Data cleanup, numbers sold outside system."
              className={deleteReasonError ? 'border-destructive focus-visible:ring-destructive' : ''}
            />
            {deleteReasonError && <p className="text-sm font-medium text-destructive">{deleteReasonError}</p>}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={closeDeleteModal}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} disabled={!deleteReason.trim()}>
              Yes, delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={isPreBookConfirmationOpen} onOpenChange={setIsPreBookConfirmationOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will move {selectedRows.length} number(s) to the Pre-Booking list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmPreBook}>
              Yes, Pre-Book
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
