"use client";

import { useState, useMemo } from 'react';
import { useApp } from '@/context/app-context';
import { PageHeader } from '@/components/page-header';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Trash, Download, ArrowUp, ArrowDown, ArrowUpDown, DollarSign } from 'lucide-react';
import { Pagination } from '@/components/pagination';
import { AddBasicPremiumNumberModal } from '@/components/add-basic-premium-number-modal';
import { NumberRecord, DealerSaleRecord, DealerDeleteRecord } from '@/lib/data';
import { TableSpinner } from '@/components/ui/spinner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/context/auth-context';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import Papa from 'papaparse';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RecordBasicPremiumPaymentModal } from '@/components/record-basic-premium-payment-modal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';

const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50, 100, 250, 500, 1000, 5000];
type SortableColumn = string;

export default function BasicPremiumPage() {
  const { 
    basicNumbers, 
    premiumNumbers,
    basicPremiumSales, 
    basicPremiumDeletes, 
    basicPremiumPayments,
    loading,
    basicNumbersLoading,
    premiumNumbersLoading,
    basicPremiumSalesLoading,
    basicPremiumDeletesLoading,
    deleteBasicPremiumNumbers,
    markBasicPremiumNumbersAsSold,
    addActivity 
  } = useApp();
  const { role, user } = useAuth();
  const { toast } = useToast();
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [vendorFilter, setVendorFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState<{ key: SortableColumn; direction: 'ascending' | 'descending' } | null>({ key: 'srNo', direction: 'descending' });
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('basic-inventory');
  
  const [bulkNumbers, setBulkNumbers] = useState('');
  const [isSellConfirmOpen, setIsSellConfirmOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [salePrice, setSalePrice] = useState<number>(0);
  const [deleteReason, setDeleteReason] = useState('Manual Deletion');
  const [processingRecords, setProcessingRecords] = useState<NumberRecord[]>([]);

  const allPurchasedRecords = useMemo(() => {
    const active = [...basicNumbers, ...premiumNumbers].map(p => ({
      vendorName: p.purchaseFrom || 'Unknown',
      purchasePrice: Number(p.purchasePrice) || 0,
    }));

    const sold = basicPremiumSales.map(s => ({
      vendorName: s.dealerName || 'Unknown',
      purchasePrice: Number(s.purchasePrice) || 0,
    }));

    const deleted = basicPremiumDeletes.map(d => ({
      vendorName: d.dealerName || 'Unknown',
      purchasePrice: Number(d.purchasePrice) || 0,
    }));

    return [...active, ...sold, ...deleted];
  }, [basicNumbers, premiumNumbers, basicPremiumSales, basicPremiumDeletes]);

  const vendorOptions = useMemo(() => {
    const all = allPurchasedRecords.map(p => p.vendorName).filter(Boolean);
    const fromPayments = basicPremiumPayments.map(p => p.vendorName).filter(Boolean);
    return [...new Set(['all', ...all, ...fromPayments])];
  }, [allPurchasedRecords, basicPremiumPayments]);

  const { totalBilled, totalPaid, amountRemaining } = useMemo(() => {
    const soldPurchases = basicPremiumSales.map(s => ({
      vendorName: s.dealerName || 'Unknown',
      purchasePrice: Number(s.purchasePrice) || 0,
    }));

    const relevantPurchases = vendorFilter === 'all'
      ? soldPurchases
      : soldPurchases.filter(p => p.vendorName === vendorFilter);

    const totalBilled = relevantPurchases.reduce((sum, p) => sum + p.purchasePrice, 0);
    
    const vendorNames = vendorFilter === 'all' 
      ? new Set([...allPurchasedRecords.map(p => p.vendorName), ...basicPremiumPayments.map(p => p.vendorName)])
      : new Set([vendorFilter]);
    
    const totalPaid = basicPremiumPayments
      .filter(p => vendorNames.has(p.vendorName))
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      
    return {
      totalBilled,
      totalPaid,
      amountRemaining: totalBilled - totalPaid
    };
  }, [basicPremiumSales, allPurchasedRecords, basicPremiumPayments, vendorFilter]);

  const sortedData = useMemo(() => {
    let items: any[] = [];
    if (activeTab === 'basic-inventory') items = basicNumbers;
    else if (activeTab === 'premium-inventory') items = premiumNumbers;
    else if (activeTab === 'sales') items = basicPremiumSales;
    else if (activeTab === 'deletes') items = basicPremiumDeletes;
    
    let sortableItems = [...items].filter(item => {
      const vendorName = activeTab === 'sales' || activeTab === 'deletes' ? (item as any).dealerName : (item as any).purchaseFrom;
      return (vendorFilter === 'all' || vendorName === vendorFilter) &&
      (item.mobile && item.mobile.toLowerCase().includes(searchTerm.toLowerCase()))
    });

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
           comparison = (aValue as any).toDate().getTime() - (bValue as any).toDate().getTime();
        } else {
          if (aValue < bValue) comparison = -1;
          if (aValue > bValue) comparison = 1;
        }
        return sortConfig.direction === 'ascending' ? comparison : -comparison;
      });
    }
    return sortableItems;
  }, [basicNumbers, premiumNumbers, basicPremiumSales, basicPremiumDeletes, sortConfig, searchTerm, vendorFilter, activeTab]);

  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  const paginatedData = sortedData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePageChange = (page: number) => setCurrentPage(page);

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
    const pageIds = paginatedData.map(p => p.id);
    if (checked) {
      setSelectedRows(prev => [...new Set([...prev, ...pageIds])]);
    } else {
      setSelectedRows(prev => prev.filter(id => !pageIds.includes(id)));
    }
  };

  const handleAction = (action: 'sell' | 'delete', fromSelected: boolean) => {
    let records: NumberRecord[] = [];
    const currentInv = activeTab === 'basic-inventory' ? basicNumbers : premiumNumbers;
    if (fromSelected) {
      records = currentInv.filter(p => selectedRows.includes(p.id));
    } else {
      const numbers = bulkNumbers.split(/[\n,]+/).map(n => n.trim().replace(/\D/g, '')).filter(n => n.length === 10);
      records = currentInv.filter(p => numbers.includes(p.mobile));
      if (records.length === 0 && numbers.length > 0) {
        toast({ variant: 'destructive', title: 'No records found', description: 'None of the provided numbers match existing inventory.' });
        return;
      }
    }

    if (records.length === 0) {
      toast({ variant: 'destructive', title: 'No selection', description: 'Please select records or enter numbers.' });
      return;
    }

    setProcessingRecords(records);
    if (action === 'sell') {
      const rawSalePrice = records[0].salePrice;
      const numericPrice = typeof rawSalePrice === 'number' ? rawSalePrice : Number(rawSalePrice) || 0;
      setSalePrice(records.length === 1 ? numericPrice : 0);
      setIsSellConfirmOpen(true);
    } else {
      setIsDeleteConfirmOpen(true);
    }
  };

  const confirmSell = () => {
    const type = activeTab === 'basic-inventory' ? 'basic' : 'premium';
    markBasicPremiumNumbersAsSold(processingRecords, type, salePrice);
    setIsSellConfirmOpen(false);
    setSelectedRows([]);
    setBulkNumbers('');
  };

  const confirmDelete = () => {
    const type = activeTab === 'basic-inventory' ? 'basic' : 'premium';
    deleteBasicPremiumNumbers(processingRecords, type, deleteReason);
    setIsDeleteConfirmOpen(false);
    setSelectedRows([]);
    setBulkNumbers('');
  };

  const exportToCsv = (dataToExport: any[], fileName: string) => {
    const formattedData = dataToExport.map(p => ({
      "Sr.No": p.srNo,
      "Mobile": p.mobile,
      "Vendor Name": p.purchaseFrom || p.dealerName,
      "Sum": p.sum,
      "Purchase Price": p.purchasePrice,
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
  };

  const handleExportSelected = () => {
    const currentItems = activeTab === 'basic-inventory' ? basicNumbers : premiumNumbers;
    const selectedData = currentItems.filter(p => selectedRows.includes(p.id));
    if (selectedData.length === 0) {
      toast({ variant: "destructive", title: "No records selected", description: "Please select at least one record to export." });
      return;
    }
    exportToCsv(selectedData, `bp_export_${activeTab}.csv`);
    addActivity({
      employeeName: user?.displayName || 'User',
      action: 'Exported Data',
      description: `Exported ${selectedData.length} selected ${activeTab} records to CSV.`
    });
    setSelectedRows([]);
  };

  const isAllOnPageSelected = paginatedData.length > 0 && paginatedData.every(p => selectedRows.includes(p.id));

  const getSortIcon = (columnKey: string) => {
    if (!sortConfig || sortConfig.key !== columnKey) return <ArrowUpDown className="ml-2 h-4 w-4 opacity-30" />;
    return sortConfig.direction === 'ascending' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />;
  };

  const SortableHeader = ({ column, label }: { column: string, label: string }) => (
    <TableHead>
      <Button variant="ghost" onClick={() => requestSort(column)} className="px-0 hover:bg-transparent">
        {label}
        {getSortIcon(column)}
      </Button>
    </TableHead>
  );

  const highlightMatch = (text: string, highlight: string) => {
    if (!highlight.trim()) return <span>{text}</span>;
    const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) =>
          part.toLowerCase() === highlight.toLowerCase() ? (
            <span key={i} className="bg-yellow-300 dark:bg-yellow-700 rounded-sm">{part}</span>
          ) : (part)
        )}
      </span>
    );
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title="Basic / Premium Numbers"
        description="Manage inventory, sales, and deletes for Basic and Premium numbers."
      >
        <div className="flex flex-col sm:flex-row items-center gap-2">
          <Button onClick={() => setIsAddModalOpen(true)} className="w-full sm:w-auto">
            <PlusCircle className="mr-2 h-4 w-4" />
            Add New Number
          </Button>
          <Button 
            variant="outline" 
            onClick={() => {
              if (vendorFilter === 'all') {
                toast({ title: "Select Vendor", description: "Please select a specific vendor to record a payment.", variant: "destructive" });
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

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <Card className="lg:col-span-1 bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/20">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Billed</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalBilled.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Total cost of sold numbers</p>
          </CardContent>
        </Card>
        <Card className="lg:col-span-1 bg-green-50 dark:bg-green-900/10 border-green-100 dark:border-green-900/20">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-green-600 dark:text-green-400">Total Paid</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">₹{totalPaid.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Total payments made</p>
          </CardContent>
        </Card>
        <Card className="lg:col-span-1 bg-orange-50 dark:bg-orange-900/10 border-orange-100 dark:border-orange-900/20">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-orange-600 dark:text-orange-400">Amount Remaining</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">₹{amountRemaining.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Pending balance</p>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2 bg-slate-50 dark:bg-slate-900/10 border-slate-100 dark:border-slate-900/20 shadow-sm hover:shadow-md transition-all">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><PlusCircle className="h-4 w-4 text-slate-500" />Perform Batch Operations</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex gap-3">
              <textarea
                placeholder="Enter numbers separated by comma or new line..."
                className="flex-1 min-h-[70px] p-2 text-sm border rounded-md bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none"
                value={bulkNumbers}
                onChange={(e) => setBulkNumbers(e.target.value)}
              />
              <div className="flex flex-col gap-2 justify-center">
                <Button size="sm" onClick={() => handleAction('sell', false)} disabled={!bulkNumbers.trim() || activeTab.includes('inventory') === false} className="bg-green-600 hover:bg-green-700 text-white">Mark Sold</Button>
                <Button size="sm" variant="destructive" onClick={() => handleAction('delete', false)} disabled={!bulkNumbers.trim() || activeTab.includes('inventory') === false}>Delete</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={(val) => { setActiveTab(val); setCurrentPage(1); setSelectedRows([]); }} className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-8">
          <TabsTrigger value="basic-inventory">Basic Inventory</TabsTrigger>
          <TabsTrigger value="premium-inventory">Premium Inventory</TabsTrigger>
          <TabsTrigger value="sales">Sales History</TabsTrigger>
          <TabsTrigger value="deletes">Deletes History</TabsTrigger>
        </TabsList>

        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-4 flex-wrap">
            <Select value={vendorFilter} onValueChange={setVendorFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filter by Vendor" /></SelectTrigger>
              <SelectContent>
                {vendorOptions.map(option => (
                  <SelectItem key={option} value={option}>{option === 'all' ? 'All Vendors' : option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Search by mobile number..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="max-w-full sm:max-w-sm"
            />
            <Select value={String(itemsPerPage)} onValueChange={handleItemsPerPageChange}>
              <SelectTrigger className="w-full sm:w-[120px]"><SelectValue placeholder="Items per page" /></SelectTrigger>
              <SelectContent>
                {ITEMS_PER_PAGE_OPTIONS.map(val => (
                  <SelectItem key={val} value={String(val)}>{val} / page</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {activeTab.includes('inventory') && selectedRows.length > 0 && (
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => handleAction('sell', true)} className="border-green-200 bg-green-50 text-green-700 hover:bg-green-100">Mark Sold ({selectedRows.length})</Button>
                {role === 'admin' && <Button variant="destructive" onClick={() => handleAction('delete', true)}><Trash className="mr-2 h-4 w-4" />Delete ({selectedRows.length})</Button>}
                <Button variant="outline" onClick={handleExportSelected}><Download className="mr-2 h-4 w-4" />Export ({selectedRows.length})</Button>
              </div>
            )}
          </div>
        </div>

        <TabsContent value="basic-inventory">
          <InventoryTable data={paginatedData} loading={basicNumbersLoading} searchTerm={searchTerm} onSelectRow={handleSelectRow} selectedRows={selectedRows} isAllOnPageSelected={isAllOnPageSelected} onSelectAllOnPage={handleSelectAllOnPage} role={role} onSell={(r: NumberRecord) => { setProcessingRecords([r]); setSalePrice(typeof r.salePrice === 'number' ? r.salePrice : Number(r.salePrice) || 0); setIsSellConfirmOpen(true); }} onDelete={(r: NumberRecord) => { setProcessingRecords([r]); setIsDeleteConfirmOpen(true); }} highlightMatch={highlightMatch} SortableHeader={SortableHeader} />
        </TabsContent>

        <TabsContent value="premium-inventory">
          <InventoryTable data={paginatedData} loading={premiumNumbersLoading} searchTerm={searchTerm} onSelectRow={handleSelectRow} selectedRows={selectedRows} isAllOnPageSelected={isAllOnPageSelected} onSelectAllOnPage={handleSelectAllOnPage} role={role} onSell={(r: NumberRecord) => { setProcessingRecords([r]); setSalePrice(typeof r.salePrice === 'number' ? r.salePrice : Number(r.salePrice) || 0); setIsSellConfirmOpen(true); }} onDelete={(r: NumberRecord) => { setProcessingRecords([r]); setIsDeleteConfirmOpen(true); }} highlightMatch={highlightMatch} SortableHeader={SortableHeader} />
        </TabsContent>

        <TabsContent value="sales">
          <SalesTable data={paginatedData as DealerSaleRecord[]} loading={basicPremiumSalesLoading} searchTerm={searchTerm} highlightMatch={highlightMatch} SortableHeader={SortableHeader} />
        </TabsContent>

        <TabsContent value="deletes">
          <DeletesTable data={paginatedData as DealerDeleteRecord[]} loading={basicPremiumDeletesLoading} searchTerm={searchTerm} highlightMatch={highlightMatch} SortableHeader={SortableHeader} />
        </TabsContent>
      </Tabs>

      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} itemsPerPage={itemsPerPage} totalItems={sortedData.length} />
      
      <AddBasicPremiumNumberModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
      <RecordBasicPremiumPaymentModal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} vendorName={vendorFilter} />

      <AlertDialog open={isSellConfirmOpen} onOpenChange={setIsSellConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Mark to Sold</AlertDialogTitle><AlertDialogDescription>Confirm selling {processingRecords.length} record(s). Enter the actual sale price per number.</AlertDialogDescription></AlertDialogHeader>
          <div className="py-4"><Label>Sale Price (₹)</Label><Input type="number" value={salePrice} onChange={(e) => setSalePrice(Number(e.target.value))} className="mt-2" /></div>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={confirmSell} className="bg-green-600 hover:bg-green-700">Confirm & Move to Sales</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Numbers</AlertDialogTitle><AlertDialogDescription>Are you sure? {processingRecords.length} record(s) will be moved to Deletes.</AlertDialogDescription></AlertDialogHeader>
          <div className="py-4"><Label>Reason for Deletion</Label><Input value={deleteReason} onChange={(e) => setDeleteReason(e.target.value)} className="mt-2" placeholder="Manual Deletion" /></div>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">Yes, Move to Deletes</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function InventoryTable({ data, loading, searchTerm, selectedRows, onSelectRow, isAllOnPageSelected, onSelectAllOnPage, role, onSell, onDelete, highlightMatch, SortableHeader }: any) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
          <TableRow>
            <TableHead className="w-12">{role === 'admin' && <Checkbox checked={isAllOnPageSelected} onCheckedChange={onSelectAllOnPage} />}</TableHead>
            <SortableHeader column="srNo" label="Sr.No" />
            <SortableHeader column="mobile" label="Number" />
            <SortableHeader column="purchaseFrom" label="Vendor Name" />
            <SortableHeader column="sum" label="Sum" />
            <SortableHeader column="purchasePrice" label="Purchase Price" />
            <SortableHeader column="salePrice" label="Sale Price" />
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? <TableSpinner colSpan={8} /> : data.length > 0 ? (
            data.map((record: any) => (
              <TableRow key={record.id} data-state={selectedRows.includes(record.id) && "selected"}>
                <TableCell>{role === 'admin' && <Checkbox checked={selectedRows.includes(record.id)} onCheckedChange={() => onSelectRow(record.id)} />}</TableCell>
                <TableCell>{record.srNo}</TableCell>
                <TableCell className="font-medium">{highlightMatch(record.mobile, searchTerm)}</TableCell>
                <TableCell>{record.purchaseFrom}</TableCell>
                <TableCell>{record.sum}</TableCell>
                <TableCell className="font-semibold">₹{(record.purchasePrice || 0).toLocaleString()}</TableCell>
                <TableCell className="text-green-600 dark:text-green-400 font-semibold">₹{(record.salePrice || 0).toLocaleString()}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50" onClick={() => onSell(record)} title="Mark to Sold"><DollarSign className="h-4 w-4" /></Button>
                    {role === 'admin' && <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => onDelete(record)} title="Delete"><Trash className="h-4 w-4" /></Button>}
                  </div>
                </TableCell>
              </TableRow>
            ))
          ) : <TableRow><TableCell colSpan={8} className="h-24 text-center">No inventory records found.</TableCell></TableRow>}
        </TableBody>
      </Table>
    </div>
  );
}

function SalesTable({ data, loading, searchTerm, highlightMatch, SortableHeader }: any) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
          <TableRow>
            <SortableHeader column="srNo" label="Sr.No" />
            <SortableHeader column="mobile" label="Number" />
            <SortableHeader column="dealerName" label="Vendor Name" />
            <SortableHeader column="purchasePrice" label="Purchase Price" />
            <SortableHeader column="salePrice" label="Sale Price" />
            <SortableHeader column="saleDate" label="Sale Date" />
            <TableHead>Profit</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? <TableSpinner colSpan={7} /> : data.length > 0 ? (
            data.map((sale: any) => (
              <TableRow key={sale.id}>
                <TableCell>{sale.srNo}</TableCell>
                <TableCell className="font-medium">{highlightMatch(sale.mobile, searchTerm)}</TableCell>
                <TableCell>{sale.dealerName}</TableCell>
                <TableCell>₹{(sale.purchasePrice || 0).toLocaleString()}</TableCell>
                <TableCell className="text-green-600 dark:text-green-400 font-semibold">₹{(sale.salePrice || 0).toLocaleString()}</TableCell>
                <TableCell>{sale.saleDate ? format(sale.saleDate.toDate(), 'dd MMM yyyy HH:mm') : 'N/A'}</TableCell>
                <TableCell className="font-bold text-green-600">₹{((sale.salePrice || 0) - (sale.purchasePrice || 0)).toLocaleString()}</TableCell>
              </TableRow>
            ))
          ) : <TableRow><TableCell colSpan={7} className="h-24 text-center">No sales records found.</TableCell></TableRow>}
        </TableBody>
      </Table>
    </div>
  );
}

function DeletesTable({ data, loading, searchTerm, highlightMatch, SortableHeader }: any) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
          <TableRow>
            <SortableHeader column="srNo" label="Sr.No" />
            <SortableHeader column="mobile" label="Number" />
            <SortableHeader column="dealerName" label="Vendor Name" />
            <SortableHeader column="purchasePrice" label="Purchase Price" />
            <SortableHeader column="deletedAt" label="Deleted At" />
            <SortableHeader column="deletedBy" label="Deleted By" />
            <TableHead>Reason</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? <TableSpinner colSpan={7} /> : data.length > 0 ? (
            data.map((del: any) => (
              <TableRow key={del.id}>
                <TableCell>{del.srNo}</TableCell>
                <TableCell className="font-medium">{highlightMatch(del.mobile, searchTerm)}</TableCell>
                <TableCell>{del.dealerName}</TableCell>
                <TableCell>₹{(del.purchasePrice || 0).toLocaleString()}</TableCell>
                <TableCell>{del.deletedAt ? format(del.deletedAt.toDate(), 'dd MMM yyyy HH:mm') : 'N/A'}</TableCell>
                <TableCell>{del.deletedBy}</TableCell>
                <TableCell className="text-red-600 text-xs italic">{del.reason}</TableCell>
              </TableRow>
            ))
          ) : <TableRow><TableCell colSpan={7} className="h-24 text-center">No deleted records found.</TableCell></TableRow>}
        </TableBody>
      </Table>
    </div>
  );
}
