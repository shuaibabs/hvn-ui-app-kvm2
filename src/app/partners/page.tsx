
"use client";

import { useState, useMemo } from 'react';
import { useApp } from '@/context/app-context';
import { PageHeader } from '@/components/page-header';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination } from '@/components/pagination';
import { format } from 'date-fns';
import { TableSpinner } from '@/components/ui/spinner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import type { NumberRecord, SaleRecord } from '@/lib/data';
import { Timestamp } from 'firebase/firestore';
import { useNavigation } from '@/context/navigation-context';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/auth-context';
import { Input } from '@/components/ui/input';

const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50, 100, 250, 500, 1000, 5000];

type CombinedPartnershipRecord = {
  id: string;
  srNo?: number;
  mobile: string;
  sum: number;
  partnerName?: string;
  purchasePrice: number;
  purchaseDate: Timestamp;
  salePrice: number | string;
  saleDate: Timestamp | null;
  status: 'Active' | 'Sold';
  assignedTo?: string;
};

type SortableColumn = keyof CombinedPartnershipRecord;

export default function PartnersPage() {
  const { numbers, sales, loading } = useApp();
  const { navigate } = useNavigation();
  const { user, role } = useAuth();
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState<{ key: SortableColumn; direction: 'ascending' | 'descending' } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const combinedPartnershipNumbers: CombinedPartnershipRecord[] = useMemo(() => {
    const activePartnershipNumbers: CombinedPartnershipRecord[] = numbers
      .filter(num => num.ownershipType === 'Partnership')
      .map(num => ({
        id: num.id,
        srNo: num.srNo,
        mobile: num.mobile,
        sum: num.sum,
        partnerName: num.partnerName,
        purchasePrice: num.purchasePrice,
        purchaseDate: num.purchaseDate,
        salePrice: num.salePrice,
        saleDate: null,
        status: 'Active',
        assignedTo: num.assignedTo,
      }));

    const soldPartnershipNumbers: CombinedPartnershipRecord[] = sales
      .filter(sale => sale.originalNumberData?.ownershipType === 'Partnership')
      .map(sale => ({
        id: sale.id,
        srNo: sale.srNo,
        mobile: sale.mobile,
        sum: sale.sum,
        partnerName: sale.originalNumberData.partnerName,
        purchasePrice: sale.originalNumberData.purchasePrice,
        purchaseDate: sale.originalNumberData.purchaseDate,
        salePrice: sale.salePrice,
        saleDate: sale.saleDate,
        status: 'Sold',
        assignedTo: sale.originalNumberData.assignedTo,
      }));

    return [...activePartnershipNumbers, ...soldPartnershipNumbers];

  }, [numbers, sales]);

  const sortedNumbers = useMemo(() => {
    let sortableItems = [...combinedPartnershipNumbers].filter(num =>
      num.mobile && num.mobile.toLowerCase().includes(searchTerm.toLowerCase())
    );
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const aValue = a[sortConfig.key as keyof CombinedPartnershipRecord];
        const bValue = b[sortConfig.key as keyof CombinedPartnershipRecord];

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
  }, [combinedPartnershipNumbers, sortConfig, searchTerm]);

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
        title="Partnership Numbers"
        description="List of all numbers under a partnership agreement, including active and sold inventory."
      />
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
        </div>
      </div>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHeader column="srNo" label="Sr.No" />
              <SortableHeader column="mobile" label="Number" />
              <SortableHeader column="sum" label="Sum" />
              <SortableHeader column="partnerName" label="Partner Name" />
              <SortableHeader column="purchasePrice" label="Purchase Price" />
              <SortableHeader column="purchaseDate" label="Purchase Date" />
              <SortableHeader column="salePrice" label="Sale Price" />
              <SortableHeader column="saleDate" label="Sale Date" />
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableSpinner colSpan={10} />
            ) : paginatedNumbers.length > 0 ? (
              paginatedNumbers.map((num) => (
                <TableRow
                  key={num.id}
                >
                  <TableCell>{num.srNo ?? 'N/A'}</TableCell>
                  <TableCell className="font-medium">{highlightMatch(num.mobile, searchTerm)}</TableCell>
                  <TableCell>{num.sum}</TableCell>
                  <TableCell>{num.partnerName ?? 'N/A'}</TableCell>
                  <TableCell>₹{num.purchasePrice.toLocaleString()}</TableCell>
                  <TableCell>{num.purchaseDate ? format(num.purchaseDate.toDate(), 'PPP') : 'N/A'}</TableCell>
                  <TableCell>₹{Number(num.salePrice).toLocaleString()}</TableCell>
                  <TableCell>{num.saleDate ? format(num.saleDate.toDate(), 'PPP') : 'N/A'}</TableCell>
                  <TableCell>
                    <Badge variant={num.status === 'Active' ? 'default' : 'secondary'} className={num.status === 'Active' ? 'bg-green-500/20 text-green-700' : ''}>
                      {num.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {num.status === 'Active' && (
                      <Button variant="outline" size="sm" onClick={() => navigate(`/numbers/${num.id}`)}>
                        View Details
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={10} className="h-24 text-center">
                  {searchTerm ? `No partnership numbers found for "${searchTerm}".` : "No partnership numbers found."}
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
    </>
  );
}
