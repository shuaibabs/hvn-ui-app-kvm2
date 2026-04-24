

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
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RecordDealerPaymentModal } from '@/components/record-dealer-payment-modal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DealerSaleRecord, DealerDeleteRecord } from '@/lib/data';
import { format } from 'date-fns';


const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50, 100, 250, 500, 1000, 5000];
type SortableColumn = string;

export default function DealerPurchasesPage() {
  const { 
    dealerPurchases, 
    dealerSales, 
    dealerDeletes, 
    dealerPayments, 
    loading, 
    dealerSalesLoading, 
    dealerDeletesLoading, 
    deleteDealerPurchases, 
    markDealerPurchasesAsSold, 
    addActivity 
  } = useApp();
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
  const [activeTab, setActiveTab] = useState('inventory');
  
  // New states for bulk actions
  const [bulkNumbers, setBulkNumbers] = useState('');
  const [isSellConfirmOpen, setIsSellConfirmOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [salePrice, setSalePrice] = useState<number>(0);
  const [deleteReason, setDeleteReason] = useState('Manual Deletion');
  const [processingRecords, setProcessingRecords] = useState<DealerPurchaseRecord[]>([]);

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
    let items = activeTab === 'inventory' ? dealerPurchases : activeTab === 'sales' ? dealerSales : dealerDeletes;
    
    let sortableItems = [...items].filter(item =>
      (dealerFilter === 'all' || item.dealerName === dealerFilter) &&
      (item.mobile && item.mobile.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const aValue = a[sortConfig.key as keyof typeof a];
        const bValue = b[sortConfig.key as keyof typeof b];

        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;

        let comparison = 0;
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          comparison = aValue.localeCompare(bValue);
        } else if (typeof aValue === 'object' && aValue !== null && 'toDate' in aValue && typeof bValue === 'object' && bValue !== null && 'toDate' in bValue) {
           // Handle Firestore Timestamps
           comparison = (aValue as any).toDate().getTime() - (bValue as any).toDate().getTime();
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
  }, [dealerPurchases, dealerSales, dealerDeletes, sortConfig, searchTerm, dealerFilter, activeTab]);


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

  const handleAction = (action: 'sell' | 'delete', fromSelected: boolean) => {
    let records: DealerPurchaseRecord[] = [];
    if (fromSelected) {
      records = dealerPurchases.filter(p => selectedRows.includes(p.id));
    } else {
      const numbers = bulkNumbers.split(/[\n,]+/).map(n => n.trim().replace(/\D/g, '')).filter(n => n.length === 10);
      records = dealerPurchases.filter(p => numbers.includes(p.mobile));
      if (records.length === 0 && numbers.length > 0) {
        toast({ variant: 'destructive', title: 'No records found', description: 'None of the provided numbers match existing dealer purchases.' });
        return;
      }
    }

    if (records.length === 0) {
      toast({ variant: 'destructive', title: 'No selection', description: 'Please select records or enter numbers.' });
      return;
    }

    setProcessingRecords(records);
    if (action === 'sell') {
      setSalePrice(records.length === 1 ? (records[0].intendedSalePrice || 0) : 0);
      setIsSellConfirmOpen(true);
    } else {
      setIsDeleteConfirmOpen(true);
    }
  };

  const confirmSell = () => {
    markDealerPurchasesAsSold(processingRecords, salePrice);
    setIsSellConfirmOpen(false);
    setSelectedRows([]);
    setBulkNumbers('');
  };

  const confirmDelete = () => {
    deleteDealerPurchases(processingRecords, deleteReason);
    setIsDeleteConfirmOpen(false);
    setSelectedRows([]);
    setBulkNumbers('');
  };

  const handleDeleteSelected = () => {
    handleAction('delete', true);
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


  const getSortIcon = (columnKey: string) => {
    if (!sortConfig || sortConfig.key !== columnKey) {
      return <ArrowUpDown className="ml-2 h-4 w-4 opacity-30" />;
    }
    if (sortConfig.direction === 'ascending') {
      return <ArrowUp className="ml-2 h-4 w-4" />;
    }
    return <ArrowDown className="ml-2 h-4 w-4" />;
  };

  const SortableHeader = ({ column, label }: { column: string, label: string }) => (
    <TableHead>
      <Button variant="ghost" onClick={() => requestSort(column as any)} className="px-0 hover:bg-transparent">
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

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-8">
        <Card className="lg:col-span-1 bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Billed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalBilled.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Total cost of all purchases</p>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1 bg-green-50 dark:bg-green-900/10 border-green-100 dark:border-green-900/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600 dark:text-green-400">Total Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">₹{totalPaid.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Total payments made</p>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1 bg-orange-50 dark:bg-orange-900/10 border-orange-100 dark:border-orange-900/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-orange-600 dark:text-orange-400">Amount Remaining</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">₹{amountRemaining.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Pending balance</p>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 bg-slate-50 dark:bg-slate-900/10 border-slate-100 dark:border-slate-900/20 shadow-sm hover:shadow-md transition-all">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <PlusCircle className="h-4 w-4 text-slate-500" />
              Perform Batch Operations
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex gap-3">
              <textarea
                placeholder="Enter numbers separated by comma or new line..."
                className="flex-1 min-h-[70px] p-2 text-sm border rounded-md bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none"
                value={bulkNumbers}
                onChange={(e) => setBulkNumbers(e.target.value)}
              />
              <div className="flex flex-col gap-2 justify-center">
                <Button 
                  size="sm" 
                  onClick={() => handleAction('sell', false)} 
                  disabled={!bulkNumbers.trim()}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  Mark Sold
                </Button>
                <Button 
                  size="sm" 
                  variant="destructive" 
                  onClick={() => handleAction('delete', false)} 
                  disabled={!bulkNumbers.trim()}
                >
                  Delete
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      <Tabs value={activeTab} onValueChange={(val) => { setActiveTab(val); setCurrentPage(1); setSelectedRows([]); }} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8">
          <TabsTrigger value="inventory">Purchases (Inventory)</TabsTrigger>
          <TabsTrigger value="sales">Dealer Sales</TabsTrigger>
          <TabsTrigger value="deletes">Dealer Deletes</TabsTrigger>
        </TabsList>

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
            {activeTab === 'inventory' && selectedRows.length > 0 && (
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => handleAction('sell', true)}
                  className="border-green-200 bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/10 dark:border-green-900/20"
                >
                  Mark Sold ({selectedRows.length})
                </Button>
                {role === 'admin' && (
                  <Button variant="destructive" onClick={() => handleAction('delete', true)}>
                    <Trash className="mr-2 h-4 w-4" />
                    Delete Selected ({selectedRows.length})
                  </Button>
                )}
                <Button variant="outline" onClick={handleExportSelected}>
                  <Download className="mr-2 h-4 w-4" />
                  Export Selected ({selectedRows.length})
                </Button>
              </div>
            )}
          </div>
        </div>

        <TabsContent value="inventory">
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
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
                  <TableHead>Type</TableHead>
                  <SortableHeader column="sum" label="Sum" />
                  <SortableHeader column="price" label="Purchase Price" />
                  <SortableHeader column="intendedSalePrice" label="Intended Sale Price" />
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableSpinner colSpan={9} />
                ) : paginatedPurchases.length > 0 ? (
                  (paginatedPurchases as DealerPurchaseRecord[]).map((purchase) => (
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
                      <TableCell>
                        <Badge variant={purchase.stockType === 'Premium' ? 'default' : 'outline'} className={purchase.stockType === 'Premium' ? 'bg-amber-500 hover:bg-amber-600' : ''}>
                          {purchase.stockType || 'Basic'}
                        </Badge>
                      </TableCell>
                      <TableCell>{purchase.sum}</TableCell>
                      <TableCell className="font-semibold">₹{(purchase.price || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-green-600 dark:text-green-400 font-semibold">₹{purchase.intendedSalePrice?.toLocaleString() || '0'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                            onClick={() => {
                              setProcessingRecords([purchase as any]);
                              setSalePrice((purchase as any).intendedSalePrice || 0);
                              setIsSellConfirmOpen(true);
                            }}
                            title="Mark to Sold"
                          >
                            <DollarSign className="h-4 w-4" />
                          </Button>
                          {role === 'admin' && (
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => {
                                setProcessingRecords([purchase as any]);
                                setIsDeleteConfirmOpen(true);
                              }}
                              title="Delete"
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center">
                      {searchTerm ? `No dealer purchases found for "${searchTerm}".` : "No dealer purchases found."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="sales">
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
                <TableRow>
                  <SortableHeader column="srNo" label="Sr.No" />
                  <SortableHeader column="mobile" label="Number" />
                  <SortableHeader column="dealerName" label="Dealer Name" />
                  <TableHead>Type</TableHead>
                  <SortableHeader column="purchasePrice" label="Purchase Price" />
                  <SortableHeader column="salePrice" label="Sale Price" />
                  <SortableHeader column="saleDate" label="Sale Date" />
                  <TableHead>Profit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dealerSalesLoading ? (
                  <TableSpinner colSpan={8} />
                ) : paginatedPurchases.length > 0 ? (
                  (paginatedPurchases as DealerSaleRecord[]).map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell>{sale.srNo}</TableCell>
                      <TableCell className="font-medium">{highlightMatch(sale.mobile, searchTerm)}</TableCell>
                      <TableCell>{sale.dealerName}</TableCell>
                      <TableCell>
                        <Badge variant={sale.stockType === 'Premium' ? 'default' : 'outline'} className={sale.stockType === 'Premium' ? 'bg-amber-500 hover:bg-amber-600' : ''}>
                          {sale.stockType || 'Basic'}
                        </Badge>
                      </TableCell>
                      <TableCell>₹{(sale.purchasePrice || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-green-600 dark:text-green-400 font-semibold">₹{(sale.salePrice || 0).toLocaleString()}</TableCell>
                      <TableCell>{sale.saleDate ? format(sale.saleDate.toDate(), 'dd MMM yyyy HH:mm') : 'N/A'}</TableCell>
                      <TableCell className="font-bold text-green-600">
                        ₹{((sale.salePrice || 0) - (sale.purchasePrice || 0)).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                      No sales records found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="deletes">
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
                <TableRow>
                  <SortableHeader column="srNo" label="Sr.No" />
                  <SortableHeader column="mobile" label="Number" />
                  <SortableHeader column="dealerName" label="Dealer Name" />
                  <TableHead>Type</TableHead>
                  <SortableHeader column="purchasePrice" label="Purchase Price" />
                  <SortableHeader column="deletedAt" label="Deleted At" />
                  <SortableHeader column="deletedBy" label="Deleted By" />
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dealerDeletesLoading ? (
                  <TableSpinner colSpan={8} />
                ) : paginatedPurchases.length > 0 ? (
                  (paginatedPurchases as DealerDeleteRecord[]).map((del) => (
                    <TableRow key={del.id}>
                      <TableCell>{del.srNo}</TableCell>
                      <TableCell className="font-medium">{highlightMatch(del.mobile, searchTerm)}</TableCell>
                      <TableCell>{del.dealerName}</TableCell>
                      <TableCell>
                        <Badge variant={del.stockType === 'Premium' ? 'default' : 'outline'} className={del.stockType === 'Premium' ? 'bg-amber-500 hover:bg-amber-600' : ''}>
                          {del.stockType || 'Basic'}
                        </Badge>
                      </TableCell>
                      <TableCell>₹{(del.purchasePrice || 0).toLocaleString()}</TableCell>
                      <TableCell>{del.deletedAt ? format(del.deletedAt.toDate(), 'dd MMM yyyy HH:mm') : 'N/A'}</TableCell>
                      <TableCell>{del.deletedBy}</TableCell>
                      <TableCell className="text-red-600 text-xs italic">{del.reason}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                      No deleted records found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
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

      {/* Sell Confirmation Dialog */}
      <AlertDialog open={isSellConfirmOpen} onOpenChange={setIsSellConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark to Sold</AlertDialogTitle>
            <AlertDialogDescription>
              Confirm selling {processingRecords.length} record(s). Enter the actual sale price per number.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label>Sale Price (₹)</Label>
            <Input 
              type="number" 
              value={salePrice} 
              onChange={(e) => setSalePrice(Number(e.target.value))}
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSell} className="bg-green-600 hover:bg-green-700">
              Confirm & Move to Sales
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Dealer Purchases</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure? {processingRecords.length} record(s) will be moved to Dealer Deletes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label>Reason for Deletion</Label>
            <Input 
              value={deleteReason} 
              onChange={(e) => setDeleteReason(e.target.value)}
              className="mt-2"
              placeholder="Manual Deletion"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              Yes, Move to Deletes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
