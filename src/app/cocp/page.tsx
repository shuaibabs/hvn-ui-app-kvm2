
"use client";

import { useState, useMemo } from 'react';
import { useApp } from '@/context/app-context';
import { PageHeader } from '@/components/page-header';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination } from '@/components/pagination';
import { format, isPast, isToday } from 'date-fns';
import { TableSpinner } from '@/components/ui/spinner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, Download, MoreHorizontal, ArrowUp, ArrowDown, Edit, Calendar } from 'lucide-react';
import { NumberRecord } from '@/lib/data';
import { Timestamp } from 'firebase/firestore';
import { Checkbox } from '@/components/ui/checkbox';
import Papa from 'papaparse';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { EditCocpDateModal } from '@/components/edit-cocp-date-modal';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';
import { Input } from '@/components/ui/input';
import { BulkEditCocpDateModal } from '@/components/bulk-edit-cocp-date-modal';
import { BulkChangeCocpDateModal } from '@/components/bulk-change-cocp-date-modal';


const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50, 100, 250, 500, 1000, 5000];
type SortableColumn = keyof NumberRecord;

export default function CocpPage() {
  const { numbers, loading, addActivity } = useApp();
  const { user, role } = useAuth();
  const { toast } = useToast();
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState<{ key: SortableColumn; direction: 'ascending' | 'descending' } | null>(null);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [selectedNumber, setSelectedNumber] = useState<NumberRecord | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false);
  const [isBulkChangeDateModalOpen, setIsBulkChangeDateModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const cocpNumbers = useMemo(() => {
    return numbers.filter(num => num.numberType === 'COCP');
  }, [numbers]);

  const sortedNumbers = useMemo(() => {
    let sortableItems = [...cocpNumbers].filter(num =>
      num.mobile && num.mobile.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Primary sort: bring records with arrived safe custody date to the top
    sortableItems.sort((a, b) => {
      const aHasArrived = a.safeCustodyDate && (isToday(a.safeCustodyDate.toDate()) || isPast(a.safeCustodyDate.toDate()));
      const bHasArrived = b.safeCustodyDate && (isToday(b.safeCustodyDate.toDate()) || isPast(b.safeCustodyDate.toDate()));

      if (aHasArrived && !bHasArrived) return -1;
      if (!aHasArrived && bHasArrived) return 1;
      return 0;
    });

    // Secondary sort: user-defined column sorting
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        // Keep the primary sort order
        const aHasArrived = a.safeCustodyDate && (isToday(a.safeCustodyDate.toDate()) || isPast(a.safeCustodyDate.toDate()));
        const bHasArrived = b.safeCustodyDate && (isToday(b.safeCustodyDate.toDate()) || isPast(b.safeCustodyDate.toDate()));
        if (aHasArrived && !bHasArrived) return -1;
        if (!aHasArrived && bHasArrived) return 1;

        const aValue = a[sortConfig.key as keyof NumberRecord];
        const bValue = b[sortConfig.key as keyof NumberRecord];

        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;

        let comparison = 0;
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          comparison = aValue.localeCompare(bValue);
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
  }, [cocpNumbers, sortConfig, searchTerm]);

  const totalPages = Math.ceil(sortedNumbers.length / itemsPerPage);
  const paginatedNumbers = sortedNumbers.slice(
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

  const requestSort = (key: SortableColumn) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
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

  const exportToCsv = (dataToExport: NumberRecord[], fileName: string) => {
    const formattedData = dataToExport.map(n => ({
      "Sr.No": n.srNo,
      "Mobile": n.mobile,
      "Sum": n.sum,
      "Status": n.status,
      "Account Name": n.accountName,
      "RTP Date": n.rtpDate ? format(n.rtpDate.toDate(), 'yyyy-MM-dd') : 'N/A',
      "Safe Custody Date": n.safeCustodyDate ? format(n.safeCustodyDate.toDate(), 'yyyy-MM-dd') : 'N/A',
    }));

    const csv = Papa.unparse(formattedData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const handleExportSelected = () => {
    const selectedData = cocpNumbers.filter(n => selectedRows.includes(n.id));
    if (selectedData.length === 0) {
      toast({
        variant: "destructive",
        title: "No COCP numbers selected",
        description: "Please select at least one number to export.",
      });
      return;
    }
    exportToCsv(selectedData, 'cocp_numbers_export.csv');
    addActivity({
      employeeName: user?.displayName || 'User',
      action: 'Exported Data',
      description: `Exported ${selectedData.length} selected COCP number(s) to CSV.`
    });
    toast({
      title: "Export Successful",
      description: `${selectedData.length} selected COCP numbers have been exported to CSV.`,
    });
    setSelectedRows([]);
  }

  const handleEditClick = (number: NumberRecord) => {
    setSelectedNumber(number);
    setIsEditModalOpen(true);
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

  const selectedNumberRecords = cocpNumbers.filter(n => selectedRows.includes(n.id));

  return (
    <>
      <PageHeader
        title="COCP Numbers"
        description="List of all COCP (Customer Owned Customer Premise) numbers."
      >
        <Button onClick={() => setIsBulkChangeDateModalOpen(true)} variant="outline">
          <Calendar className="mr-2 h-4 w-4" />
          Bulk Change Date
        </Button>
      </PageHeader>
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-4 flex-wrap">
          <Input
            placeholder="Search by mobile number..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="max-w-full sm:max-w-sm"
          />
          <Select value={String(itemsPerPage)} onValueChange={handleItemsPerPageChange}>
            <SelectTrigger className="w-[120px]">
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
              <Button variant="outline" onClick={handleExportSelected} disabled={loading || selectedRows.length === 0}>
                <Download className="mr-2 h-4 w-4" />
                Export Selected ({selectedRows.length})
              </Button>
              <Button variant="outline" onClick={() => setIsBulkEditModalOpen(true)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Safe Custody Date ({selectedRows.length})
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
              <SortableHeader column="srNo" label="Sr.No" />
              <SortableHeader column="mobile" label="Number" />
              <SortableHeader column="accountName" label="Account Name" />
              <SortableHeader column="sum" label="Sum" />
              <SortableHeader column="status" label="Status" />
              <SortableHeader column="rtpDate" label="RTP Date" />
              <SortableHeader column="safeCustodyDate" label="Safe Custody Date" />
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableSpinner colSpan={9} />
            ) : paginatedNumbers.length > 0 ? (
              paginatedNumbers.map((num) => {
                const hasSafeCustodyDateArrived = num.safeCustodyDate && (isToday(num.safeCustodyDate.toDate()) || isPast(num.safeCustodyDate.toDate()));

                return (
                  <TableRow
                    key={num.id}
                    data-state={selectedRows.includes(num.id) && "selected"}
                    className={cn(hasSafeCustodyDateArrived && "bg-red-200 dark:bg-red-800/30 hover:bg-red-200/80 dark:hover:bg-red-800/40 data-[state=selected]:bg-red-300 dark:data-[state=selected]:bg-red-800/50")}
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedRows.includes(num.id)}
                        onCheckedChange={() => handleSelectRow(num.id)}
                        aria-label="Select row"
                      />
                    </TableCell>
                    <TableCell>{num.srNo}</TableCell>
                    <TableCell className="font-medium">{highlightMatch(num.mobile, searchTerm)}</TableCell>
                    <TableCell>{num.accountName}</TableCell>
                    <TableCell>{num.sum}</TableCell>
                    <TableCell>
                      <Badge variant={num.status === 'RTP' ? 'default' : 'destructive'} className={num.status === 'RTP' ? `bg-green-500/20 text-green-700` : `bg-red-500/20 text-red-700`}>{num.status}</Badge>
                    </TableCell>
                    <TableCell>{num.rtpDate ? format(num.rtpDate.toDate(), 'PPP') : 'N/A'}</TableCell>
                    <TableCell>{num.safeCustodyDate ? format(num.safeCustodyDate.toDate(), 'PPP') : 'N/A'}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditClick(num)}>
                            Edit Date
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
                  {searchTerm ? `No COCP numbers found for "${searchTerm}".` : "No COCP numbers found."}
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
        totalItems={sortedNumbers.length}
      />
      {selectedNumber && (
        <EditCocpDateModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          number={selectedNumber}
        />
      )}
      <BulkEditCocpDateModal
        isOpen={isBulkEditModalOpen}
        onClose={() => {
          setIsBulkEditModalOpen(false);
          setSelectedRows([]);
        }}
        selectedNumbers={selectedNumberRecords}
      />
      <BulkChangeCocpDateModal
        isOpen={isBulkChangeDateModalOpen}
        onClose={() => setIsBulkChangeDateModalOpen(false)}
      />
    </>
  );
}
