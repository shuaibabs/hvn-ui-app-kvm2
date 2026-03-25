

"use client";

import { useState, useMemo } from 'react';
import { useApp } from '@/context/app-context';
import { PageHeader } from '@/components/page-header';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, MoreHorizontal, ArrowUpDown, Trash, Download, ArrowUp, ArrowDown, DollarSign } from 'lucide-react';
import { Pagination } from '@/components/pagination';
import { AddDealerPurchaseModal } from '@/components/add-dealer-purchase-modal';
import { DealerPurchaseRecord } from '@/lib/data';
import { TableSpinner } from '@/components/ui/spinner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/context/auth-context';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import Papa from 'papaparse';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RecordDealerPaymentModal } from '@/components/record-dealer-payment-modal';


const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50, 100, 250, 500, 1000, 5000];
type SortableColumn = keyof DealerPurchaseRecord;

export default function DealerPurchasesPage() {
  const { dealerPurchases, dealerPayments, loading, deleteDealerPurchases, addActivity } = useApp();
  const { role, user } = useAuth();
  const { toast } = useToast();
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [dealerFilter, setDealerFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState<{ key: SortableColumn; direction: 'ascending' | 'descending' } | null>({ key: 'srNo', direction: 'descending' });
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const dealerOptions = useMemo(() => {
    const allDealers = dealerPurchases.map(p => p.dealerName).filter(Boolean);
    return [...new Set(['all', ...allDealers])];
  }, [dealerPurchases]);

  const { totalBilled, totalPaid, amountRemaining } = useMemo(() => {
    const relevantPurchases = dealerFilter === 'all'
      ? dealerPurchases
      : dealerPurchases.filter(p => p.dealerName === dealerFilter);

    const totalBilled = relevantPurchases.reduce((sum, p) => sum + (p.price || 0), 0);
    
    // Get unique dealer names from relevant purchase records if 'all', else just the filtered dealer
    const dealerNames = dealerFilter === 'all' 
      ? new Set(dealerPurchases.map(p => p.dealerName))
      : new Set([dealerFilter]);
    
    // Sum payments for these dealers from dealerPayments collection
    const totalPaid = dealerPayments
      .filter(p => dealerNames.has(p.vendorName))
      .reduce((sum, p) => sum + (p.amount || 0), 0);
      
    return {
      totalBilled,
      totalPaid,
      amountRemaining: totalBilled - totalPaid
    };
  }, [dealerPurchases, dealerPayments, dealerFilter]);

  const sortedPurchases = useMemo(() => {
    let sortableItems = [...dealerPurchases].filter(purchase =>
      (dealerFilter === 'all' || purchase.dealerName === dealerFilter) &&
      (purchase.mobile && purchase.mobile.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const aValue = a[sortConfig.key as keyof DealerPurchaseRecord];
        const bValue = b[sortConfig.key as keyof DealerPurchaseRecord];

        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;

        let comparison = 0;
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          comparison = aValue.localeCompare(bValue);
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
  }, [dealerPurchases, sortConfig, searchTerm]);


  const totalPages = Math.ceil(sortedPurchases.length / itemsPerPage);
  const paginatedPurchases = sortedPurchases.slice(
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
    const pageIds = paginatedPurchases.map(p => p.id);
    if (checked) {
      setSelectedRows(prev => [...new Set([...prev, ...pageIds])]);
    } else {
      setSelectedRows(prev => prev.filter(id => !pageIds.includes(id)));
    }
  };

  const handleDeleteSelected = () => {
    const selectedPurchases = dealerPurchases.filter(p => selectedRows.includes(p.id));
    deleteDealerPurchases(selectedPurchases);
    setSelectedRows([]);
  };

  const exportToCsv = (dataToExport: DealerPurchaseRecord[], fileName: string) => {
    const formattedData = dataToExport.map(p => ({
      "Sr.No": p.srNo,
      "Mobile": p.mobile,
      "Dealer Name": p.dealerName,
      "Sum": p.sum,
      "Price": p.price,
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
    const selectedData = dealerPurchases.filter(p => selectedRows.includes(p.id));
    if (selectedData.length === 0) {
      toast({
        variant: "destructive",
        title: "No records selected",
        description: "Please select at least one record to export.",
      });
      return;
    }
    exportToCsv(selectedData, 'dealer_purchases_export.csv');
    addActivity({
      employeeName: user?.displayName || 'User',
      action: 'Exported Data',
      description: `Exported ${selectedData.length} selected dealer purchase(s) to CSV.`
    });
    toast({
      title: "Export Successful",
      description: `${selectedData.length} selected dealer purchases have been exported to CSV.`,
    });
    setSelectedRows([]);
  }

  const isAllOnPageSelected = paginatedPurchases.length > 0 && paginatedPurchases.every(p => selectedRows.includes(p.id));


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

  return (
    <>
      <PageHeader
        title="Purchase from Other Dealers"
        description="A list of numbers purchased from other dealers."
      >
        <div className="flex flex-col sm:flex-row items-center gap-2">
          <Button onClick={() => setIsAddModalOpen(true)} className="w-full sm:w-auto">
            <PlusCircle className="mr-2 h-4 w-4" />
            Add New Number
          </Button>
          <Button 
            variant="outline" 
            onClick={() => {
              if (dealerFilter === 'all') {
                toast({
                  title: "Select Dealer",
                  description: "Please select a specific dealer to record a payment.",
                  variant: "destructive"
                });
                return;
              }
              setIsPaymentModalOpen(true);
            }} 
            className="w-full sm:w-auto"
          >
            <DollarSign className="mr-2 h-4 w-4" />
            Record Payment
          </Button>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Billed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalBilled.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Total cost of all purchases</p>
          </CardContent>
        </Card>

        <Card className="bg-green-50 dark:bg-green-900/10 border-green-100 dark:border-green-900/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600 dark:text-green-400">Total Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">₹{totalPaid.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Total payments made</p>
          </CardContent>
        </Card>

        <Card className="bg-orange-50 dark:bg-orange-900/10 border-orange-100 dark:border-orange-900/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-orange-600 dark:text-orange-400">Amount Remaining</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">₹{amountRemaining.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Pending balance</p>
          </CardContent>
        </Card>

        <Card className="bg-purple-50 dark:bg-purple-900/10 border-purple-100 dark:border-purple-900/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-purple-600 dark:text-purple-400">Total Records</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sortedPurchases.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Number of purchase entries</p>
          </CardContent>
        </Card>
      </div>
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-4 flex-wrap">
          <Select value={dealerFilter} onValueChange={setDealerFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by Dealer" />
            </SelectTrigger>
            <SelectContent>
              {dealerOptions.map(option => (
                <SelectItem key={option} value={option}>
                  {option === 'all' ? 'All Dealers' : option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
            <div className="flex items-center gap-2">
              {role === 'admin' && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">
                      <Trash className="mr-2 h-4 w-4" />
                      Delete Selected ({selectedRows.length})
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone and will permanently delete {selectedRows.length} record(s).
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDeleteSelected}>
                        Yes, delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              <Button variant="outline" onClick={handleExportSelected}>
                <Download className="mr-2 h-4 w-4" />
                Export Selected ({selectedRows.length})
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
                {role === 'admin' && (
                  <Checkbox
                    checked={isAllOnPageSelected}
                    onCheckedChange={handleSelectAllOnPage}
                    aria-label="Select all on this page"
                  />
                )}
              </TableHead>
              <SortableHeader column="srNo" label="Sr.No" />
              <SortableHeader column="mobile" label="Number" />
              <SortableHeader column="dealerName" label="Dealer Name" />
              <SortableHeader column="sum" label="Sum" />
              <SortableHeader column="price" label="Price" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableSpinner colSpan={6} />
            ) : paginatedPurchases.length > 0 ? (
              paginatedPurchases.map((purchase) => (
                <TableRow key={purchase.id} data-state={selectedRows.includes(purchase.id) && "selected"}>
                  <TableCell>
                    {role === 'admin' && (
                      <Checkbox
                        checked={selectedRows.includes(purchase.id)}
                        onCheckedChange={() => handleSelectRow(purchase.id)}
                        aria-label="Select row"
                      />
                    )}
                  </TableCell>
                  <TableCell>{purchase.srNo}</TableCell>
                  <TableCell className="font-medium">{highlightMatch(purchase.mobile, searchTerm)}</TableCell>
                  <TableCell>{purchase.dealerName}</TableCell>
                  <TableCell>{purchase.sum}</TableCell>
                  <TableCell>₹{purchase.price.toLocaleString()}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  {searchTerm ? `No dealer purchases found for "${searchTerm}".` : "No dealer purchases found."}
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
        totalItems={sortedPurchases.length}
      />
      <AddDealerPurchaseModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
      <RecordDealerPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        dealerName={dealerFilter}
      />
    </>
  );
}
