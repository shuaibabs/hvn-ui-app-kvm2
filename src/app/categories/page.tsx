"use client";

import { useState, useMemo } from 'react';
import { useApp } from '@/context/app-context';
import { CATEGORIES, CategoryKey, CategoryDefinition } from '@/lib/vipNumberFilters';
import type { NumberRecord } from '@/lib/data';
import { PageHeader } from '@/components/page-header';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/pagination';
import { Spinner, TableSpinner } from '@/components/ui/spinner';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { useNavigation } from '@/context/navigation-context';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  MoreHorizontal,
  DollarSign,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Copy,
  Bookmark,
  Edit,
  Trash,
  X,
  Tags,
  Search,
  ExternalLink
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { RtpStatusModal } from '@/components/rts-status-modal';
import { EditUploadStatusModal } from '@/components/edit-upload-status-modal';
import { SellNumberModal } from '@/components/sell-number-modal';
import { EditLocationModal } from '@/components/edit-location-modal';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

type SortableColumn = keyof NumberRecord | 'id' | 'twoDigitSum';

export default function CategoriesPage() {
  const { numbers, loading, markAsPreBooked } = useApp();
  const { role } = useAuth();
  const { navigate } = useNavigation();
  const { toast } = useToast();

  const [categorySearch, setCategorySearch] = useState('');
  const [selectedCategoryKey, setSelectedCategoryKey] = useState<CategoryKey | null>(null);

  // Number table filtering / pagination / sorting
  const [numberSearch, setNumberSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState<{ key: SortableColumn; direction: 'ascending' | 'descending' } | null>({ key: 'srNo', direction: 'ascending' });

  // Action Modals State
  const [selectedNumber, setSelectedNumber] = useState<NumberRecord | null>(null);
  const [isRtpModalOpen, setIsRtpModalOpen] = useState(false);
  const [isSellModalOpen, setIsSellModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [selectedRowsForLocation, setSelectedRowsForLocation] = useState<string[]>([]);

  // 1. Calculate live counts for each category
  const categoryStats = useMemo(() => {
    return CATEGORIES.map(cat => {
      const matched = numbers.filter(num => cat.check(num.mobile));
      return {
        ...cat,
        count: matched.length,
        numbers: matched
      };
    });
  }, [numbers]);

  // 2. Filter categories grid by search
  const filteredCategories = useMemo(() => {
    return categoryStats.filter(cat =>
      cat.label.toLowerCase().includes(categorySearch.toLowerCase()) ||
      cat.description.toLowerCase().includes(categorySearch.toLowerCase())
    );
  }, [categoryStats, categorySearch]);

  const selectedCategoryInfo = useMemo(() => {
    if (!selectedCategoryKey) return null;
    return categoryStats.find(cat => cat.key === selectedCategoryKey) || null;
  }, [categoryStats, selectedCategoryKey]);

  // 3. Simple Sum Helper
  const calculateSimpleSum = (mobile: string): number => {
    return mobile
      .split('')
      .map(Number)
      .reduce((acc, digit) => acc + digit, 0);
  };

  // 4. Sorted and Filtered Numbers matching the selected Category
  const sortedAndFilteredNumbers = useMemo(() => {
    if (!selectedCategoryInfo) return [];

    let items = [...selectedCategoryInfo.numbers]
      .filter(num =>
        (statusFilter === 'all' || num.status === statusFilter) &&
        (typeFilter === 'all' || num.numberType === typeFilter)
      )
      .filter(num =>
        num.mobile && num.mobile.toLowerCase().includes(numberSearch.toLowerCase())
      );

    if (sortConfig !== null) {
      items.sort((a, b) => {
        const aValue = sortConfig.key === 'twoDigitSum' ? calculateSimpleSum(a.mobile) : a[sortConfig.key as keyof NumberRecord];
        const bValue = sortConfig.key === 'twoDigitSum' ? calculateSimpleSum(b.mobile) : b[sortConfig.key as keyof NumberRecord];

        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;

        let comparison = 0;
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          comparison = aValue.localeCompare(bValue);
        } else if (aValue instanceof Date && bValue instanceof Date) {
          comparison = aValue.getTime() - bValue.getTime();
        } else {
          if (aValue < bValue) comparison = -1;
          if (aValue > bValue) comparison = 1;
        }

        return sortConfig.direction === 'ascending' ? comparison : -comparison;
      });
    }

    return items;
  }, [selectedCategoryInfo, numberSearch, statusFilter, typeFilter, sortConfig]);

  // 5. Pagination
  const totalPages = Math.ceil(sortedAndFilteredNumbers.length / itemsPerPage);
  const paginatedNumbers = useMemo(() => {
    return sortedAndFilteredNumbers.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );
  }, [sortedAndFilteredNumbers, currentPage, itemsPerPage]);

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

  // Actions
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
    setSelectedRowsForLocation([number.id]);
    setIsLocationModalOpen(true);
  };

  const handlePreBook = (number: NumberRecord) => {
    markAsPreBooked([number.id]);
    toast({
      title: "Pre-booked number successfully",
      description: `${number.mobile} moved to prebookings.`
    });
  };

  const handleCopyNumber = (mobile: string) => {
    navigator.clipboard.writeText(mobile).then(() => {
      toast({ title: "Copied to clipboard!", description: mobile });
    });
  };

  const highlightMatch = (text: string, highlight: string) => {
    if (!highlight.trim()) return <span>{text}</span>;
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

  const SortableHeader = ({ column, label }: { column: SortableColumn, label: string }) => (
    <TableHead>
      <Button variant="ghost" onClick={() => requestSort(column)} className="px-0 hover:bg-transparent">
        {label}
        {getSortIcon(column)}
      </Button>
    </TableHead>
  );

  return (
    <>
      <PageHeader
        title="VIP Numbers Categories"
        description="Filter and find inventory based on NumberATM.com categories and mathematical patterns."
      />

      <div className="space-y-6">
        {/* Categories Search and Title */}
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search category by name or pattern description..."
              value={categorySearch}
              onChange={(e) => setCategorySearch(e.target.value)}
              className="pl-9"
            />
          </div>
          {selectedCategoryKey && (
            <Button
              variant="outline"
              onClick={() => {
                setSelectedCategoryKey(null);
                setNumberSearch('');
                setCurrentPage(1);
              }}
              className="w-full sm:w-auto"
            >
              <X className="mr-2 h-4 w-4" /> Clear Selected Category
            </Button>
          )}
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-h-[360px] overflow-y-auto p-1 border rounded-lg bg-card shadow-sm">
          {loading ? (
            <div className="col-span-full py-12 flex justify-center items-center">
              <Spinner className="h-8 w-8" />
            </div>
          ) : filteredCategories.length > 0 ? (
            filteredCategories.map((cat) => {
              const isSelected = selectedCategoryKey === cat.key;
              return (
                <div
                  key={cat.key}
                  onClick={() => {
                    setSelectedCategoryKey(cat.key);
                    setNumberSearch('');
                    setCurrentPage(1);
                  }}
                  className={cn(
                    "p-4 rounded-xl border cursor-pointer transition-all duration-200 select-none hover:shadow-md",
                    isSelected
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border bg-card hover:bg-accent/40"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-sm leading-tight line-clamp-1">{cat.label}</h3>
                    <Badge variant={cat.count > 0 ? "default" : "secondary"} className="shrink-0">
                      {cat.count}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-2 h-8 leading-snug">
                    {cat.description}
                  </p>
                </div>
              );
            })
          ) : (
            <div className="col-span-full py-8 text-center text-muted-foreground text-sm">
              No categories match your search terms.
            </div>
          )}
        </div>

        {/* Selected Category Numbers Table */}
        {selectedCategoryInfo && (
          <div className="space-y-4 border-t pt-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Tags className="h-5 w-5 text-primary" />
                  Category: {selectedCategoryInfo.label}
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {selectedCategoryInfo.description}
                </p>
              </div>

              {/* Filters inside category */}
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  placeholder="Filter numbers..."
                  value={numberSearch}
                  onChange={(e) => {
                    setNumberSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full sm:w-[200px]"
                />
                <Select value={statusFilter} onValueChange={(value) => {
                  setStatusFilter(value);
                  setCurrentPage(1);
                }}>
                  <SelectTrigger className="w-full sm:w-[130px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="RTP">RTP</SelectItem>
                    <SelectItem value="Non-RTP">Non-RTP</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={(value) => {
                  setTypeFilter(value);
                  setCurrentPage(1);
                }}>
                  <SelectTrigger className="w-full sm:w-[130px]">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="Prepaid">Prepaid</SelectItem>
                    <SelectItem value="Postpaid">Postpaid</SelectItem>
                    <SelectItem value="COCP">COCP</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={String(itemsPerPage)} onValueChange={handleItemsPerPageChange}>
                  <SelectTrigger className="w-full sm:w-[100px]">
                    <SelectValue placeholder="Page Size" />
                  </SelectTrigger>
                  <SelectContent>
                    {[10, 25, 50, 100].map(val => (
                      <SelectItem key={val} value={String(val)}>{val} / page</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Table */}
            <div className="border rounded-lg bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableHeader column="srNo" label="Sr.No" />
                    <SortableHeader column="mobile" label="Mobile" />
                    <SortableHeader column="sum" label="Sum" />
                    <SortableHeader column="twoDigitSum" label="2-Digit Sum" />
                    <SortableHeader column="salePrice" label="Sale Price" />
                    <SortableHeader column="numberType" label="Number Type" />
                    <SortableHeader column="uploadStatus" label="Upload Status" />
                    <SortableHeader column="assignedTo" label="Assigned To" />
                    <SortableHeader column="status" label="Status" />
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
                        className="cursor-pointer"
                        onClick={() => navigate(`/numbers/${num.id}`)}
                      >
                        <TableCell>{num.srNo}</TableCell>
                        <TableCell className="font-medium">
                          {highlightMatch(num.mobile, numberSearch)}
                        </TableCell>
                        <TableCell>{num.sum}</TableCell>
                        <TableCell>{calculateSimpleSum(num.mobile)}</TableCell>
                        <TableCell>₹{num.salePrice.toLocaleString()}</TableCell>
                        <TableCell>{num.numberType}</TableCell>
                        <TableCell>
                          <Badge variant={num.uploadStatus === 'Done' ? 'secondary' : 'outline'}>
                            {num.uploadStatus}
                          </Badge>
                        </TableCell>
                        <TableCell>{num.assignedTo}</TableCell>
                        <TableCell>
                          <Badge
                            variant={num.status === 'RTP' ? 'default' : 'destructive'}
                            className={num.status === 'RTP' ? 'bg-green-500/20 text-green-700 hover:bg-green-500/30' : 'bg-red-500/20 text-red-700 hover:bg-red-500/30'}
                          >
                            {num.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleCopyNumber(num.mobile)}
                              title="Copy Number"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            {(role === 'admin' || role === 'employee') && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => navigate(`/numbers/${num.id}`)}>
                                    <ExternalLink className="mr-2 h-4 w-4" /> View Details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleMarkRTP(num)}>
                                    <Edit className="mr-2 h-4 w-4" /> Update RTP Status
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleEditUpload(num)}>
                                    <Edit className="mr-2 h-4 w-4" /> Edit Upload Status
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleEditLocation(num)}>
                                    <Edit className="mr-2 h-4 w-4" /> Edit Location
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => handlePreBook(num)}>
                                    <Bookmark className="mr-2 h-4 w-4" /> Pre-Book Number
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-green-600 focus:text-green-700"
                                    onClick={() => handleSellNumber(num)}
                                  >
                                    <DollarSign className="mr-2 h-4 w-4" /> Mark as Sold
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">
                        No numbers match the current filters.
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
              totalItems={sortedAndFilteredNumbers.length}
            />
          </div>
        )}
      </div>

      {/* Modals */}
      {selectedNumber && (
        <RtpStatusModal
          isOpen={isRtpModalOpen}
          onClose={() => {
            setIsRtpModalOpen(false);
            setSelectedNumber(null);
          }}
          number={selectedNumber}
        />
      )}
      {selectedNumber && (
        <EditUploadStatusModal
          isOpen={isUploadModalOpen}
          onClose={() => {
            setIsUploadModalOpen(false);
            setSelectedNumber(null);
          }}
          number={selectedNumber}
        />
      )}
      {selectedNumber && (
        <SellNumberModal
          isOpen={isSellModalOpen}
          onClose={() => {
            setIsSellModalOpen(false);
            setSelectedNumber(null);
          }}
          number={selectedNumber}
        />
      )}
      {selectedNumber && (
        <EditLocationModal
          isOpen={isLocationModalOpen}
          onClose={() => {
            setIsLocationModalOpen(false);
            setSelectedNumber(null);
          }}
          selectedNumbers={[selectedNumber]}
        />
      )}
    </>
  );
}
