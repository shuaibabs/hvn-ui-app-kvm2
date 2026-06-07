"use client";

import { useState, useMemo } from 'react';
import { useApp } from '@/context/app-context';
import {
  CATEGORY_TAXONOMY,
  matchesCategory,
  matchesSubcategory,
  type CategoryId,
  type SubcategoryId,
} from '@/lib/vipNumberCategories';
import type { NumberRecord } from '@/lib/data';
import { PageHeader } from '@/components/page-header';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/pagination';
import { TableSpinner } from '@/components/ui/spinner';
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
  X,
  Tags,
  ExternalLink
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { RtpStatusModal } from '@/components/rts-status-modal';
import { EditUploadStatusModal } from '@/components/edit-upload-status-modal';
import { SellNumberModal } from '@/components/sell-number-modal';
import { EditLocationModal } from '@/components/edit-location-modal';

type SortableColumn = keyof NumberRecord | 'id' | 'twoDigitSum';
type SubSelection = 'all' | SubcategoryId;

export default function CategoriesPage() {
  const { numbers, loading, markAsPreBooked } = useApp();
  const { role } = useAuth();
  const { navigate } = useNavigation();
  const { toast } = useToast();

  const [selectedCategoryId, setSelectedCategoryId] = useState<CategoryId | null>(null);
  const [selectedSubId, setSelectedSubId] = useState<SubSelection>('all');

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

  // 1. Live counts per category
  const categoryStats = useMemo(() => {
    return CATEGORY_TAXONOMY.map(cat => ({
      ...cat,
      count: numbers.filter(num => num.mobile && matchesCategory(num.mobile, cat.id)).length,
    }));
  }, [numbers]);

  const selectedCategory = useMemo(
    () => (selectedCategoryId != null ? CATEGORY_TAXONOMY.find(c => c.id === selectedCategoryId) ?? null : null),
    [selectedCategoryId]
  );

  // 3. Subcategories of the selected category, with live counts
  const subStats = useMemo(() => {
    if (!selectedCategory) return [];
    return selectedCategory.subcategories.map(sub => ({
      ...sub,
      count: numbers.filter(num => num.mobile && matchesSubcategory(num.mobile, sub.id)).length,
    }));
  }, [selectedCategory, numbers]);

  const calculateSimpleSum = (mobile: string): number =>
    mobile.split('').map(Number).reduce((acc, digit) => acc + (Number.isNaN(digit) ? 0 : digit), 0);

  // 4. Base set = numbers matching the selected category + subcategory
  const baseNumbers = useMemo(() => {
    if (selectedCategoryId == null) return [];
    if (selectedSubId === 'all') return numbers.filter(num => num.mobile && matchesCategory(num.mobile, selectedCategoryId));
    return numbers.filter(num => num.mobile && matchesSubcategory(num.mobile, selectedSubId));
  }, [numbers, selectedCategoryId, selectedSubId]);

  // 5. Apply table filters + sorting
  const sortedAndFilteredNumbers = useMemo(() => {
    let items = baseNumbers
      .filter(num =>
        (statusFilter === 'all' || num.status === statusFilter) &&
        (typeFilter === 'all' || num.numberType === typeFilter)
      )
      .filter(num => num.mobile && num.mobile.toLowerCase().includes(numberSearch.toLowerCase()));

    if (sortConfig !== null) {
      items = [...items].sort((a, b) => {
        const aValue = sortConfig.key === 'twoDigitSum' ? calculateSimpleSum(a.mobile) : a[sortConfig.key as keyof NumberRecord];
        const bValue = sortConfig.key === 'twoDigitSum' ? calculateSimpleSum(b.mobile) : b[sortConfig.key as keyof NumberRecord];
        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;
        let comparison = 0;
        if (typeof aValue === 'string' && typeof bValue === 'string') comparison = aValue.localeCompare(bValue);
        else if (aValue instanceof Date && bValue instanceof Date) comparison = aValue.getTime() - bValue.getTime();
        else { if (aValue < bValue) comparison = -1; if (aValue > bValue) comparison = 1; }
        return sortConfig.direction === 'ascending' ? comparison : -comparison;
      });
    }
    return items;
  }, [baseNumbers, numberSearch, statusFilter, typeFilter, sortConfig]);

  // 6. Pagination
  const totalPages = Math.ceil(sortedAndFilteredNumbers.length / itemsPerPage);
  const paginatedNumbers = useMemo(
    () => sortedAndFilteredNumbers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage),
    [sortedAndFilteredNumbers, currentPage, itemsPerPage]
  );

  const selectCategory = (id: CategoryId | null) => {
    setSelectedCategoryId(id);
    setSelectedSubId('all');
    setNumberSearch('');
    setCurrentPage(1);
  };

  const handleItemsPerPageChange = (value: string) => { setItemsPerPage(Number(value)); setCurrentPage(1); };

  const requestSort = (key: SortableColumn) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') direction = 'descending';
    setSortConfig({ key, direction });
    setCurrentPage(1);
  };

  const getSortIcon = (columnKey: SortableColumn) => {
    if (!sortConfig || sortConfig.key !== columnKey) return <ArrowUpDown className="ml-2 h-4 w-4 opacity-30" />;
    return sortConfig.direction === 'ascending' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />;
  };

  const handleMarkRTP = (number: NumberRecord) => { setSelectedNumber(number); setIsRtpModalOpen(true); };
  const handleEditUpload = (number: NumberRecord) => { setSelectedNumber(number); setIsUploadModalOpen(true); };
  const handleSellNumber = (number: NumberRecord) => { setSelectedNumber(number); setIsSellModalOpen(true); };
  const handleEditLocation = (number: NumberRecord) => { setSelectedNumber(number); setIsLocationModalOpen(true); };
  const handlePreBook = (number: NumberRecord) => {
    markAsPreBooked([number.id]);
    toast({ title: 'Pre-booked number successfully', description: `${number.mobile} moved to prebookings.` });
  };
  const handleCopyNumber = (mobile: string) => {
    navigator.clipboard.writeText(mobile).then(() => toast({ title: 'Copied to clipboard!', description: mobile }));
  };

  const highlightMatch = (text: string, highlight: string) => {
    if (!highlight.trim()) return <span>{text}</span>;
    const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) =>
          part.toLowerCase() === highlight.toLowerCase()
            ? <span key={i} className="bg-yellow-300 dark:bg-yellow-700 rounded-sm">{part}</span>
            : part
        )}
      </span>
    );
  };

  const SortableHeader = ({ column, label }: { column: SortableColumn, label: string }) => (
    <TableHead>
      <Button variant="ghost" onClick={() => requestSort(column)} className="px-0 hover:bg-transparent">
        {label}{getSortIcon(column)}
      </Button>
    </TableHead>
  );

  const subLabel = selectedSubId === 'all'
    ? `All ${selectedCategory?.name ?? ''}`
    : (selectedCategory?.subcategories.find(s => s.id === selectedSubId)?.name ?? '');

  return (
    <>
      <PageHeader
        title="VIP Numbers Categories"
        description="Filter inventory by Category → Subcategory, matching the vipnumbershop.com taxonomy."
      />

      <div className="space-y-6">
        {/* Category → Subcategory dropdowns */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-4 border rounded-lg bg-card shadow-sm">
          <div className="flex-1">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Category</label>
            <Select
              value={selectedCategoryId != null ? String(selectedCategoryId) : ''}
              onValueChange={(v) => selectCategory(v ? Number(v) as CategoryId : null)}
            >
              <SelectTrigger className="w-full"><SelectValue placeholder="Select a category" /></SelectTrigger>
              <SelectContent>
                {categoryStats.map(cat => (
                  <SelectItem key={cat.id} value={String(cat.id)}>{cat.name} ({cat.count})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Subcategory</label>
            <Select
              value={String(selectedSubId)}
              onValueChange={(v) => { setSelectedSubId(v === 'all' ? 'all' : Number(v) as SubcategoryId); setCurrentPage(1); }}
              disabled={selectedCategoryId == null}
            >
              <SelectTrigger className="w-full"><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All {selectedCategory?.name ?? ''}</SelectItem>
                {subStats.map(sub => (
                  <SelectItem key={sub.id} value={String(sub.id)}>{sub.name} ({sub.count})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedCategoryId != null && (
            <Button variant="outline" onClick={() => selectCategory(null)} className="self-end">
              <X className="mr-2 h-4 w-4" /> Clear
            </Button>
          )}
        </div>

        {/* Selected Category/Subcategory Numbers Table */}
        {selectedCategory && (
          <div className="space-y-4 border-t pt-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Tags className="h-5 w-5 text-primary" />
                  {selectedCategory.name} <span className="text-muted-foreground">›</span> {subLabel}
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">{sortedAndFilteredNumbers.length} matching number(s) in stock</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Input
                  placeholder="Filter numbers..."
                  value={numberSearch}
                  onChange={(e) => { setNumberSearch(e.target.value); setCurrentPage(1); }}
                  className="w-full sm:w-[200px]"
                />
                <Select value={statusFilter} onValueChange={(value) => { setStatusFilter(value); setCurrentPage(1); }}>
                  <SelectTrigger className="w-full sm:w-[130px]"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="RTP">RTP</SelectItem>
                    <SelectItem value="Non-RTP">Non-RTP</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={(value) => { setTypeFilter(value); setCurrentPage(1); }}>
                  <SelectTrigger className="w-full sm:w-[130px]"><SelectValue placeholder="Type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="Prepaid">Prepaid</SelectItem>
                    <SelectItem value="Postpaid">Postpaid</SelectItem>
                    <SelectItem value="COCP">COCP</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={String(itemsPerPage)} onValueChange={handleItemsPerPageChange}>
                  <SelectTrigger className="w-full sm:w-[100px]"><SelectValue placeholder="Page Size" /></SelectTrigger>
                  <SelectContent>
                    {[10, 25, 50, 100].map(val => <SelectItem key={val} value={String(val)}>{val} / page</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

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
                      <TableRow key={num.id} className="cursor-pointer" onClick={() => navigate(`/numbers/${num.id}`)}>
                        <TableCell>{num.srNo}</TableCell>
                        <TableCell className="font-medium">{highlightMatch(num.mobile, numberSearch)}</TableCell>
                        <TableCell>{num.sum}</TableCell>
                        <TableCell>{calculateSimpleSum(num.mobile)}</TableCell>
                        <TableCell>₹{Number(num.salePrice).toLocaleString()}</TableCell>
                        <TableCell>{num.numberType}</TableCell>
                        <TableCell>
                          <Badge variant={num.uploadStatus === 'Done' ? 'secondary' : 'outline'}>{num.uploadStatus}</Badge>
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
                            <Button variant="ghost" size="icon" onClick={() => handleCopyNumber(num.mobile)} title="Copy Number">
                              <Copy className="h-4 w-4" />
                            </Button>
                            {(role === 'admin' || role === 'employee') && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
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
                                  <DropdownMenuItem className="text-green-600 focus:text-green-700" onClick={() => handleSellNumber(num)}>
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
              onPageChange={setCurrentPage}
              itemsPerPage={itemsPerPage}
              totalItems={sortedAndFilteredNumbers.length}
            />
          </div>
        )}
      </div>

      {/* Modals */}
      {selectedNumber && (
        <RtpStatusModal isOpen={isRtpModalOpen} onClose={() => { setIsRtpModalOpen(false); setSelectedNumber(null); }} number={selectedNumber} />
      )}
      {selectedNumber && (
        <EditUploadStatusModal isOpen={isUploadModalOpen} onClose={() => { setIsUploadModalOpen(false); setSelectedNumber(null); }} number={selectedNumber} />
      )}
      {selectedNumber && (
        <SellNumberModal isOpen={isSellModalOpen} onClose={() => { setIsSellModalOpen(false); setSelectedNumber(null); }} number={selectedNumber} />
      )}
      {selectedNumber && (
        <EditLocationModal isOpen={isLocationModalOpen} onClose={() => { setIsLocationModalOpen(false); setSelectedNumber(null); }} selectedNumbers={[selectedNumber]} />
      )}
    </>
  );
}
