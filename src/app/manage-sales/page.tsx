

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
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import Papa from 'papaparse';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedWeek, setSelectedWeek] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  const soldToOptions = useMemo(() => {
    const allVendors = sales.map(s => s.soldTo).filter(Boolean);
    return [...new Set(['all', ...allVendors])];
  }, [sales]);

  const availableWeeks = useMemo(() => {
    if (selectedMonth === 'all' || selectedYear === 'all') {
      return [];
    }
    const year = parseInt(selectedYear);
    const month = parseInt(selectedMonth) - 1;
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);

    const weeks = [];
    let current = start;
    let weekIndex = 1;

    while (current <= end) {
      const dayOfWeek = current.getDay();
      const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
      
      const weekEnd = new Date(current);
      weekEnd.setDate(current.getDate() + daysUntilSunday);
      
      const actualEnd = weekEnd > end ? end : weekEnd;

      weeks.push({
        id: weekIndex.toString(),
        label: `Week ${weekIndex} (${format(current, 'dd MMM')} - ${format(actualEnd, 'dd MMM')})`,
        start: new Date(current),
        end: new Date(actualEnd)
      });

      current = new Date(actualEnd);
      current.setDate(current.getDate() + 1);
      weekIndex++;
    }
    return weeks;
  }, [selectedMonth, selectedYear]);

  // The statement period (start/end) derived from the active filters. Used to split
  // transactions into Past (before) / Period (in range) / Future (after) for the export.
  const periodBounds = useMemo<{ start: Date | null; end: Date | null }>(() => {
    if (fromDate || toDate) {
      return {
        start: fromDate ? startOfDay(new Date(fromDate)) : null,
        end: toDate ? endOfDay(new Date(toDate)) : null,
      };
    }
    if (selectedYear !== 'all') {
      const y = parseInt(selectedYear);
      if (selectedMonth !== 'all') {
        const m = parseInt(selectedMonth) - 1;
        if (selectedWeek !== 'all') {
          const w = availableWeeks.find(w => w.id === selectedWeek);
          if (w) return { start: startOfDay(w.start), end: endOfDay(w.end) };
        }
        const ref = new Date(y, m, 1);
        return { start: startOfMonth(ref), end: endOfMonth(ref) };
      }
      const refY = new Date(y, 0, 1);
      return { start: startOfYear(refY), end: endOfYear(refY) };
    }
    return { start: null, end: null };
  }, [fromDate, toDate, selectedYear, selectedMonth, selectedWeek, availableWeeks]);

  const filteredSales = useMemo(() => {
    return sales.filter(sale => {
      const saleDate = sale.saleDate.toDate();
      const monthMatch = selectedMonth === 'all' || (saleDate.getMonth() + 1).toString() === selectedMonth;
      const yearMatch = selectedYear === 'all' || saleDate.getFullYear().toString() === selectedYear;
      
      let weekMatch = true;
      if (selectedWeek !== 'all') {
        if (availableWeeks.length > 0) {
          const selectedWeekData = availableWeeks.find(w => w.id === selectedWeek);
          if (selectedWeekData) {
            const sDate = new Date(saleDate);
            sDate.setHours(0,0,0,0);
            const wStart = new Date(selectedWeekData.start);
            wStart.setHours(0,0,0,0);
            const wEnd = new Date(selectedWeekData.end);
            wEnd.setHours(23,59,59,999);
            weekMatch = sDate >= wStart && sDate <= wEnd;
          } else {
            weekMatch = false;
          }
        } else {
          weekMatch = false;
        }
      }

      const vendorMatch = soldToFilter === 'all' || sale.soldTo === soldToFilter;
      const searchMatch = !searchTerm || (sale.mobile && sale.mobile.toLowerCase().includes(searchTerm.toLowerCase()));
      
      let dateRangeMatch = true;
      if (fromDate) {
        const from = new Date(fromDate);
        from.setHours(0, 0, 0, 0);
        if (saleDate < from) dateRangeMatch = false;
      }
      if (toDate) {
        const to = new Date(toDate);
        to.setHours(23, 59, 59, 999);
        if (saleDate > to) dateRangeMatch = false;
      }

      return monthMatch && yearMatch && weekMatch && vendorMatch && searchMatch && dateRangeMatch;
    });
  }, [sales, soldToFilter, searchTerm, selectedMonth, selectedWeek, selectedYear, fromDate, toDate, availableWeeks]);

  const { totalPurchaseAmount, totalSaleAmount } = useMemo(() => {
    return filteredSales.reduce((acc, sale) => {
      acc.totalPurchaseAmount += sale.originalNumberData?.purchasePrice || 0;
      acc.totalSaleAmount += sale.salePrice || 0;
      return acc;
    }, { totalPurchaseAmount: 0, totalSaleAmount: 0 });
  }, [filteredSales]);

  // Payments that fall within the active filter (vendor + period). Reused by the
  // summary cards and the export statement builder.
  const periodPayments = useMemo(() => {
    return salesPayments.filter(p => {
      const pDate = p.paymentDate.toDate();
      const vendorMatch = soldToFilter === 'all' || p.vendorName === soldToFilter;
      const monthMatch = selectedMonth === 'all' || (pDate.getMonth() + 1).toString() === selectedMonth;
      const yearMatch = selectedYear === 'all' || pDate.getFullYear().toString() === selectedYear;

      let weekMatch = true;
      if (selectedWeek !== 'all') {
        if (availableWeeks.length > 0) {
          const selectedWeekData = availableWeeks.find(w => w.id === selectedWeek);
          if (selectedWeekData) {
            const pDateObj = new Date(pDate);
            pDateObj.setHours(0, 0, 0, 0);
            const wStart = new Date(selectedWeekData.start);
            wStart.setHours(0, 0, 0, 0);
            const wEnd = new Date(selectedWeekData.end);
            wEnd.setHours(23, 59, 59, 999);
            weekMatch = pDateObj >= wStart && pDateObj <= wEnd;
          } else {
            weekMatch = false;
          }
        } else {
          weekMatch = false;
        }
      }

      let dateRangeMatch = true;
      if (fromDate) {
        const from = new Date(fromDate);
        from.setHours(0, 0, 0, 0);
        if (pDate < from) dateRangeMatch = false;
      }
      if (toDate) {
        const to = new Date(toDate);
        to.setHours(23, 59, 59, 999);
        if (pDate > to) dateRangeMatch = false;
      }

      return vendorMatch && monthMatch && yearMatch && weekMatch && dateRangeMatch;
    });
  }, [salesPayments, soldToFilter, selectedMonth, selectedWeek, selectedYear, fromDate, toDate, availableWeeks]);

  const totalPaid = useMemo(() => periodPayments.reduce((sum, p) => sum + p.amount, 0), [periodPayments]);
  const amountRemaining = totalSaleAmount - totalPaid;

  const totalProfitLoss = totalSaleAmount - totalPurchaseAmount;

  // Full account statement for export: vendor (+search) scoped sales/payments split into
  // Past / Selected-Period / Future buckets, with opening, closing and all-time balances.
  const statement = useMemo(() => {
    const { start, end } = periodBounds;
    const hasPeriod = !!(start || end);

    const scopedSales = sales.filter(s => {
      const vendorMatch = soldToFilter === 'all' || s.soldTo === soldToFilter;
      const searchMatch = !searchTerm || (s.mobile && s.mobile.toLowerCase().includes(searchTerm.toLowerCase()));
      return vendorMatch && searchMatch;
    });
    const scopedPayments = salesPayments.filter(p => soldToFilter === 'all' || p.vendorName === soldToFilter);

    const before = (d: Date) => !!start && d < start;
    const after = (d: Date) => !!end && d > end;

    const pastSales = hasPeriod ? scopedSales.filter(s => before(s.saleDate.toDate())) : [];
    const futureSales = hasPeriod ? scopedSales.filter(s => after(s.saleDate.toDate())) : [];
    const periodSales = filteredSales; // already vendor + period + search filtered

    const pastPayments = hasPeriod ? scopedPayments.filter(p => before(p.paymentDate.toDate())) : [];
    const futurePayments = hasPeriod ? scopedPayments.filter(p => after(p.paymentDate.toDate())) : [];

    const sumBill = (arr: SaleRecord[]) => arr.reduce((s, x) => s + (x.salePrice || 0), 0);
    const sumPay = (arr: typeof scopedPayments) => arr.reduce((s, x) => s + (x.amount || 0), 0);

    const openingBilled = sumBill(pastSales);
    const openingPaid = sumPay(pastPayments);
    const openingPending = openingBilled - openingPaid;
    const periodBilled = totalSaleAmount;
    const periodPaid = totalPaid;
    const periodPending = periodBilled - periodPaid;
    const closingPending = openingPending + periodPending;
    const futureBilled = sumBill(futureSales);
    const futurePaid = sumPay(futurePayments);
    // Grand totals are true all-time figures for the scope (independent of how the
    // period buckets partition), so they stay correct for every filter combination.
    const grandBilled = sumBill(scopedSales);
    const grandPaid = sumPay(scopedPayments);
    const grandPending = grandBilled - grandPaid;

    return {
      hasPeriod, start, end,
      pastSales, periodSales, futureSales,
      pastPayments, periodPayments, futurePayments,
      openingBilled, openingPaid, openingPending,
      periodBilled, periodPaid, periodPending,
      closingPending, futureBilled, futurePaid,
      grandBilled, grandPaid, grandPending,
    };
  }, [sales, salesPayments, soldToFilter, searchTerm, periodBounds, filteredSales, periodPayments, totalSaleAmount, totalPaid]);

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


  const buildPeriodLabel = () => {
    if (fromDate || toDate) return `${fromDate || 'Start'} to ${toDate || 'End'}`;
    const monthPart = selectedMonth === 'all' ? 'All Months' : format(new Date(2024, parseInt(selectedMonth) - 1), 'MMMM');
    const weekPart = selectedWeek !== 'all' ? ` (Week ${selectedWeek})` : '';
    const yearPart = selectedYear === 'all' ? '' : ` ${selectedYear}`;
    return `${monthPart}${weekPart}${yearPart}`.trim();
  };

  const exportToCsv = () => {
    const st = statement;
    const totalRows =
      st.periodSales.length + st.pastSales.length + st.futureSales.length +
      st.periodPayments.length + st.pastPayments.length + st.futurePayments.length;
    if (totalRows === 0) {
      toast({
        variant: "destructive",
        title: "No data to export",
        description: "There are no sales records matching the current filter."
      });
      return;
    }

    const salesHeader = ["Sr.No", "Mobile", "Sum", "Purchase From", "Purchase Price", "Purchase Date", "Sold To", "Sale Price", "Sale Date", "Remark", "Reason of Sales"];
    const payHeader = ["Date", "Vendor", "Amount", "Notes"];
    const sortS = (arr: SaleRecord[]) => [...arr].sort((a, b) => b.saleDate.toDate().getTime() - a.saleDate.toDate().getTime());
    const sortP = (arr: typeof st.periodPayments) => [...arr].sort((a, b) => b.paymentDate.toDate().getTime() - a.paymentDate.toDate().getTime());
    const saleRow = (s: SaleRecord, i: number) => [
      i + 1, s.mobile, s.sum,
      s.originalNumberData?.purchaseFrom || 'N/A',
      s.originalNumberData?.purchasePrice || 0,
      s.originalNumberData?.purchaseDate ? format(s.originalNumberData.purchaseDate.toDate(), 'dd-MM-yyyy') : 'N/A',
      s.soldTo, s.salePrice, format(s.saleDate.toDate(), 'dd-MM-yyyy'),
      s.remark || '', s.saleReason || '',
    ];
    const payRow = (p: typeof st.periodPayments[number]) => [
      format(p.paymentDate.toDate(), 'dd-MM-yyyy'), p.vendorName, p.amount, p.notes || '',
    ];

    const rows: (string | number)[][] = [];
    rows.push(['Sales Account Statement']);
    rows.push(['Scope', soldToFilter === 'all' ? 'All Vendors' : soldToFilter]);
    rows.push(['Period', buildPeriodLabel()]);
    rows.push(['Generated', format(new Date(), 'dd-MM-yyyy HH:mm')]);
    rows.push([]);

    rows.push(['BALANCE SUMMARY']);
    if (st.hasPeriod) {
      rows.push(['Opening Balance (Pending b/f)', st.openingPending]);
      rows.push(['  Billed before period', st.openingBilled]);
      rows.push(['  Paid before period', st.openingPaid]);
    }
    rows.push(['Period - Total Billed', st.periodBilled]);
    rows.push(['Period - Total Paid', st.periodPaid]);
    rows.push(['Period - Pending', st.periodPending]);
    rows.push(['Period - Total Purchase', totalPurchaseAmount]);
    rows.push(['Period - Profit / Loss', totalProfitLoss]);
    if (st.hasPeriod) rows.push(['Closing Balance (Pending as of period end)', st.closingPending]);
    if (st.futureBilled || st.futurePaid) {
      rows.push(['After Period - Billed', st.futureBilled]);
      rows.push(['After Period - Paid', st.futurePaid]);
    }
    rows.push(['Grand Total - Billed (All Time)', st.grandBilled]);
    rows.push(['Grand Total - Paid (All Time)', st.grandPaid]);
    rows.push(['Grand Total - Pending (All Time)', st.grandPending]);
    rows.push([]);

    const pushSection = (title: string, header: string[], builder: () => (string | number)[][]) => {
      rows.push([title]);
      rows.push(header);
      const body = builder();
      if (body.length) body.forEach(r => rows.push(r));
      else rows.push(['(none)']);
      rows.push([]);
    };

    pushSection('SELECTED PERIOD - SALES', salesHeader, () => sortS(st.periodSales).map(saleRow));
    pushSection('SELECTED PERIOD - PAYMENTS', payHeader, () => sortP(st.periodPayments).map(payRow));
    if (st.pastSales.length) pushSection('PAST HISTORY - SALES (before period)', salesHeader, () => sortS(st.pastSales).map(saleRow));
    if (st.pastPayments.length) pushSection('PAST HISTORY - PAYMENTS (before period)', payHeader, () => sortP(st.pastPayments).map(payRow));
    if (st.futureSales.length) pushSection('FUTURE - SALES (after period)', salesHeader, () => sortS(st.futureSales).map(saleRow));
    if (st.futurePayments.length) pushSection('FUTURE - PAYMENTS (after period)', payHeader, () => sortP(st.futurePayments).map(payRow));

    const csv = Papa.unparse(rows, { header: false });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `sales_statement_${soldToFilter}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    addActivity({
      employeeName: user?.displayName || 'User',
      action: 'Exported Sales Statement (CSV)',
      description: `Exported full sales statement for "${soldToFilter}" (period: ${buildPeriodLabel()}).`
    });

    toast({
      title: "Export Successful",
      description: `Sales statement for "${soldToFilter}" has been downloaded.`,
    });
  };

  const exportToPdf = () => {
    const st = statement;
    const totalRows =
      st.periodSales.length + st.pastSales.length + st.futureSales.length +
      st.periodPayments.length + st.pastPayments.length + st.futurePayments.length;
    if (totalRows === 0) {
      toast({
        variant: "destructive",
        title: "No data to export",
        description: "There are no sales records matching the current filter."
      });
      return;
    }

    const inr = (n: number) => `INR ${n.toLocaleString()}`;
    const doc = new jsPDF('l', 'mm', 'a4'); // Landscape for more columns

    // Header
    doc.setFontSize(20);
    doc.setTextColor(41, 128, 185);
    doc.text("HVN SALES ACCOUNT STATEMENT", 14, 18);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${format(new Date(), 'PPP p')}`, 14, 25);
    doc.text(`Vendor: ${soldToFilter === 'all' ? 'All Vendors' : soldToFilter}   |   Period: ${buildPeriodLabel()}`, 14, 31);

    // Balance summary table
    const summaryBody: (string | number)[][] = [];
    if (st.hasPeriod) summaryBody.push(['Opening Balance (Pending b/f)', inr(st.openingPending)]);
    summaryBody.push(['Period - Total Billed', inr(st.periodBilled)]);
    summaryBody.push(['Period - Total Paid', inr(st.periodPaid)]);
    summaryBody.push(['Period - Pending', inr(st.periodPending)]);
    summaryBody.push(['Period - Profit / Loss', inr(totalProfitLoss)]);
    if (st.hasPeriod) summaryBody.push(['Closing Balance (Pending @ period end)', inr(st.closingPending)]);
    if (st.futureBilled || st.futurePaid) {
      summaryBody.push(['After Period - Billed', inr(st.futureBilled)]);
      summaryBody.push(['After Period - Paid', inr(st.futurePaid)]);
    }
    summaryBody.push(['Grand Total - Billed (All Time)', inr(st.grandBilled)]);
    summaryBody.push(['Grand Total - Paid (All Time)', inr(st.grandPaid)]);
    summaryBody.push(['Grand Total - Pending (All Time)', inr(st.grandPending)]);

    autoTable(doc, {
      startY: 36,
      head: [['Balance Summary', 'Amount']],
      body: summaryBody,
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 1.5 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
      columnStyles: { 0: { cellWidth: 120 }, 1: { cellWidth: 60, halign: 'right' } },
      margin: { left: 14 },
    });

    const saleCols = ["#", "Mobile", "Sum", "Sold To", "Sale Price", "Sale Date", "Reason"];
    const payCols = ["Date", "Vendor", "Amount", "Notes"];
    const sortS = (arr: SaleRecord[]) => [...arr].sort((a, b) => b.saleDate.toDate().getTime() - a.saleDate.toDate().getTime());
    const sortP = (arr: typeof st.periodPayments) => [...arr].sort((a, b) => b.paymentDate.toDate().getTime() - a.paymentDate.toDate().getTime());
    const saleBody = (arr: SaleRecord[]) => sortS(arr).map((s, i) => [
      i + 1, s.mobile, s.sum, s.soldTo, inr(s.salePrice), format(s.saleDate.toDate(), 'dd-MM-yyyy'), s.saleReason || '-'
    ]);
    const payBody = (arr: typeof st.periodPayments) => sortP(arr).map(p => [
      format(p.paymentDate.toDate(), 'dd-MM-yyyy'), p.vendorName, inr(p.amount), p.notes || '-'
    ]);

    const addTable = (title: string, head: string[], body: (string | number)[][], color: [number, number, number]) => {
      if (body.length === 0) return;
      let y = ((doc as any).lastAutoTable?.finalY ?? 36) + 10;
      if (y > 185) { doc.addPage(); y = 18; }
      doc.setFontSize(12);
      doc.setTextColor(color[0], color[1], color[2]);
      doc.text(title, 14, y);
      autoTable(doc, {
        startY: y + 3,
        head: [head],
        body,
        styles: { fontSize: 8, cellPadding: 1.5 },
        headStyles: { fillColor: color, textColor: 255 },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        margin: { left: 14 },
      });
    };

    addTable('Selected Period - Sales', saleCols, saleBody(st.periodSales), [41, 128, 185]);
    addTable('Selected Period - Payments', payCols, payBody(st.periodPayments), [39, 174, 96]);
    addTable('Past History - Sales (before period)', saleCols, saleBody(st.pastSales), [142, 68, 173]);
    addTable('Past History - Payments (before period)', payCols, payBody(st.pastPayments), [142, 68, 173]);
    addTable('Future - Sales (after period)', saleCols, saleBody(st.futureSales), [211, 84, 0]);
    addTable('Future - Payments (after period)', payCols, payBody(st.futurePayments), [211, 84, 0]);

    const fileName = `Sales_Statement_${soldToFilter}_${buildPeriodLabel().replace(/[^a-zA-Z0-9]+/g, '_')}.pdf`;
    doc.save(fileName);

    addActivity({
      employeeName: user?.displayName || 'User',
      action: 'Exported PDF Sales Statement',
      description: `Exported full sales statement (PDF) for: ${soldToFilter} (period: ${buildPeriodLabel()}).`
    });

    toast({
      title: "PDF Export Successful",
      description: `Sales statement PDF has been downloaded.`,
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
            CSV
          </Button>
          <Button onClick={exportToPdf} disabled={loading} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            PDF
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
            <SelectTrigger className="w-full sm:w-[200px]">
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

          <Select value={selectedMonth} onValueChange={(val) => {
            setSelectedMonth(val);
            setSelectedWeek('all');
            setCurrentPage(1);
          }}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Months</SelectItem>
              {Array.from({ length: 12 }, (_, i) => (
                <SelectItem key={i + 1} value={(i + 1).toString()}>
                  {format(new Date(2024, i), 'MMMM')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedWeek} onValueChange={setSelectedWeek} disabled={selectedMonth === 'all' || selectedYear === 'all'}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Week" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Weeks</SelectItem>
              {availableWeeks.map(w => (
                <SelectItem key={w.id} value={w.id}>
                  {w.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedYear} onValueChange={(val) => {
            setSelectedYear(val);
            setSelectedWeek('all');
            setCurrentPage(1);
          }}>
            <SelectTrigger className="w-[100px]">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              {[2024, 2025, 2026].map(year => (
                <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2 border rounded-md px-2 py-1 bg-background">
            <span className="text-xs text-muted-foreground shrink-0">From:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent border-none text-xs focus:outline-none dark:color-scheme-dark"
            />
            <span className="text-xs text-muted-foreground shrink-0 ml-1">To:</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent border-none text-xs focus:outline-none dark:color-scheme-dark"
            />
          </div>

          {(selectedMonth !== 'all' || selectedWeek !== 'all' || selectedYear !== 'all' || fromDate || toDate || soldToFilter !== 'all' || searchTerm) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedMonth('all');
                setSelectedWeek('all');
                setSelectedYear('all');
                setFromDate('');
                setToDate('');
                setSoldToFilter('all');
                setSearchTerm('');
                setCurrentPage(1);
              }}
              className="h-9 px-3 text-xs"
            >
              Reset Filters
            </Button>
          )}

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
              <TableHead>Reason of Sales</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableSpinner colSpan={7} />
            ) : paginatedSales.length > 0 ? (
              paginatedSales.map((sale) => (
                <TableRow key={sale.id} onClick={() => handleRowClick(sale)} className="cursor-pointer">
                  <TableCell>{sale.srNo}</TableCell>
                  <TableCell className="font-medium">{highlightMatch(sale.mobile, searchTerm)}</TableCell>
                  <TableCell>{sale.sum}</TableCell>
                  <TableCell>{sale.soldTo}</TableCell>
                  <TableCell>₹{sale.salePrice.toLocaleString()}</TableCell>
                  <TableCell>{format(sale.saleDate.toDate(), 'PPP')}</TableCell>
                  <TableCell>{sale.saleReason || '-'}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
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
