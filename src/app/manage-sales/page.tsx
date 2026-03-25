

"use client";

import { useState, useMemo } from 'react';
import { useApp } from '@/context/app-context';
import { PageHeader } from '@/components/page-header';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Download, Search, DollarSign } from 'lucide-react';
import { Pagination } from '@/components/pagination';
import { TableSpinner } from '@/components/ui/spinner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SaleRecord } from '@/lib/data';
import { format } from 'date-fns';
import Papa from 'papaparse';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { SaleDetailsModal } from '@/components/sale-details-modal';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Timestamp } from 'firebase/firestore';
import { ReceivePaymentModal } from '@/components/receive-payment-modal';


const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50, 100, 250, 500, 1000, 5000];

export default function ManageSalesPage() {
  const { sales, loading, addActivity, salesPayments } = useApp();
  const { role, user } = useAuth();
  const { toast } = useToast();
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [soldToFilter, setSoldToFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSale, setSelectedSale] = useState<SaleRecord | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const soldToOptions = useMemo(() => {
    const allVendors = sales.map(s => s.soldTo).filter(Boolean);
    return [...new Set(['all', ...allVendors])];
  }, [sales]);

  const filteredSales = useMemo(() => {
    return sales.filter(sale =>
      (soldToFilter === 'all' || sale.soldTo === soldToFilter) &&
      (sale.mobile && sale.mobile.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [sales, soldToFilter, searchTerm]);

  const { totalPurchaseAmount, totalSaleAmount } = useMemo(() => {
    return filteredSales.reduce((acc, sale) => {
      acc.totalPurchaseAmount += sale.originalNumberData?.purchasePrice || 0;
      acc.totalSaleAmount += sale.salePrice || 0;
      return acc;
    }, { totalPurchaseAmount: 0, totalSaleAmount: 0 });
  }, [filteredSales]);

  const { totalPaid, amountRemaining } = useMemo(() => {
    const relevantPayments = soldToFilter === 'all'
      ? salesPayments
      : salesPayments.filter(p => p.vendorName === soldToFilter);

    const paid = relevantPayments.reduce((sum, p) => sum + p.amount, 0);

    return { totalPaid: paid, amountRemaining: totalSaleAmount - paid };
  }, [salesPayments, soldToFilter, totalSaleAmount]);

  const totalProfitLoss = totalSaleAmount - totalPurchaseAmount;

  const totalPages = Math.ceil(filteredSales.length / itemsPerPage);
  const paginatedSales = filteredSales.slice(
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

  const handleSoldToFilterChange = (value: string) => {
    setSoldToFilter(value);
    setCurrentPage(1);
  };

  const handleRowClick = (sale: SaleRecord) => {
    setSelectedSale(sale);
    setIsDetailsModalOpen(true);
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


  const exportToCsv = () => {
    if (filteredSales.length === 0) {
      toast({
        variant: "destructive",
        title: "No data to export",
        description: "There are no sales records matching the current filter."
      });
      return;
    }

    const summaryData = [
      ['Sales Report For', soldToFilter === 'all' ? 'All Vendors' : soldToFilter],
      [''], // Empty row for spacing
      ['Total Billed', totalSaleAmount],
      ['Total Purchase Amount', totalPurchaseAmount],
      ['Profit / Loss', totalProfitLoss],
      [''], // Empty row for spacing
    ];

    const recordsHeader = [
      "Sr.No", "Mobile", "Sum", "Purchase From", "Purchase Price", "Purchase Date", "Sold To", "Sale Price", "Sale Date"
    ];

    const sortedRecordsForExport = [...filteredSales].sort((a, b) =>
      b.saleDate.toDate().getTime() - a.saleDate.toDate().getTime()
    );

    const recordsData = sortedRecordsForExport.map(s => ([
      s.srNo,
      s.mobile,
      s.sum,
      s.originalNumberData?.purchaseFrom || 'N/A',
      s.originalNumberData?.purchasePrice || 0,
      s.originalNumberData?.purchaseDate ? format(s.originalNumberData.purchaseDate.toDate(), 'dd-MM-yyyy') : 'N/A',
      s.soldTo,
      s.salePrice,
      format(s.saleDate.toDate(), 'dd-MM-yyyy'),
    ]));

    const csvData = [...summaryData, recordsHeader, ...recordsData];

    const csv = Papa.unparse(csvData, {
      header: false // We are providing our own headers
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `sales_report_${soldToFilter}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    addActivity({
      employeeName: user?.displayName || 'User',
      action: 'Exported Sales Report',
      description: `Exported ${filteredSales.length} sales records for filter: ${soldToFilter}.`
    });

    toast({
      title: "Export Successful",
      description: `Sales report for "${soldToFilter}" has been downloaded.`,
    });
  };

  return (
    <>
      <PageHeader
        title="Manage Sales"
        description="Review, filter, and export sales records with calculated totals."
      >
        <div className="flex flex-col sm:flex-row gap-2">
          <Button onClick={() => setIsPaymentModalOpen(true)} disabled={loading || soldToFilter === 'all'} variant="outline">
            <DollarSign className="mr-2 h-4 w-4" />
            Receive Payment
          </Button>
          <Button onClick={exportToCsv} disabled={loading} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Billed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalSaleAmount.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{filteredSales.length} records</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Purchase Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalPurchaseAmount.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{filteredSales.length} records</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profit / Loss</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-bold", totalProfitLoss >= 0 ? "text-green-600" : "text-red-600")}>
              ₹{totalProfitLoss.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">&nbsp;</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalPaid.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {soldToFilter === 'all' ? 'from all vendors' : `for ${soldToFilter}`}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Amount Remaining</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-bold", amountRemaining > 0 ? "text-red-600" : "text-green-600")}>
              ₹{amountRemaining.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {soldToFilter === 'all' ? 'from all vendors' : `for ${soldToFilter}`}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between gap-4 mb-4">
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
          <Select value={soldToFilter} onValueChange={handleSoldToFilterChange}>
            <SelectTrigger className="w-full sm:w-[240px]">
              <SelectValue placeholder="Filter by Sold To" />
            </SelectTrigger>
            <SelectContent>
              {soldToOptions.map(vendor => (
                <SelectItem key={vendor} value={vendor}>
                  {vendor === 'all' ? 'All Vendors' : vendor}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
              <TableHead>Sr.No</TableHead>
              <TableHead>Mobile</TableHead>
              <TableHead>Sum</TableHead>
              <TableHead>Sold To</TableHead>
              <TableHead>Sale Price</TableHead>
              <TableHead>Sale Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableSpinner colSpan={6} />
            ) : paginatedSales.length > 0 ? (
              paginatedSales.map((sale) => (
                <TableRow key={sale.id} onClick={() => handleRowClick(sale)} className="cursor-pointer">
                  <TableCell>{sale.srNo}</TableCell>
                  <TableCell className="font-medium">{highlightMatch(sale.mobile, searchTerm)}</TableCell>
                  <TableCell>{sale.sum}</TableCell>
                  <TableCell>{sale.soldTo}</TableCell>
                  <TableCell>₹{sale.salePrice.toLocaleString()}</TableCell>
                  <TableCell>{format(sale.saleDate.toDate(), 'PPP')}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  {searchTerm ? `No sales records found for "${searchTerm}".` : "No sales records found for this filter."}
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
        totalItems={filteredSales.length}
      />
      <SaleDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        sale={selectedSale}
      />
      <ReceivePaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        vendorName={soldToFilter}
      />
    </>
  );
}
