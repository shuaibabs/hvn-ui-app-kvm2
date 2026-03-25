
"use client";

import { useState, useMemo } from 'react';
import { useApp } from '@/context/app-context';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { Pagination } from '@/components/pagination';
import { TableSpinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { LifecycleHistoryModal } from '@/components/lifecycle-history-modal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { useNavigation } from '@/context/navigation-context';

const ITEMS_PER_PAGE_OPTIONS = [5, 10, 25, 50];

export function GlobalHistory() {
  const { globalHistory, loading } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [selectedMobile, setSelectedMobile] = useState<string | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const { navigate } = useNavigation();

  const filteredHistory = useMemo(() => {
    return globalHistory.filter(record => 
      record.mobile && record.mobile.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [globalHistory, searchTerm]);

  const totalPages = Math.ceil(filteredHistory.length / itemsPerPage);
  const paginatedHistory = filteredHistory.slice(
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

  const handleRowClick = (mobile: string) => {
    setSelectedMobile(mobile);
    setIsHistoryModalOpen(true);
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
  
  return (
    <Card>
        <CardHeader>
            <div className="flex items-center justify-between">
                <div>
                    <CardTitle>Global Number History</CardTitle>
                    <CardDescription>A unified audit trail for every number in the system.</CardDescription>
                </div>
                <Button variant="outline" onClick={() => navigate('/history')}>View All</Button>
            </div>
        </CardHeader>
        <CardContent>
            <div className="flex items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-4 flex-wrap">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Search by mobile number..."
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="pl-9 max-w-full sm:max-w-xs"
                        />
                    </div>
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
                        <TableHead>Phone Number</TableHead>
                        <TableHead>Current Stage</TableHead>
                        <TableHead>RTP Status</TableHead>
                        <TableHead>Purchase From</TableHead>
                        <TableHead>Sale Date</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {loading ? (
                        <TableSpinner colSpan={5} />
                    ) : paginatedHistory.length > 0 ? (
                        paginatedHistory.map((record) => (
                        <TableRow key={record.id} onClick={() => handleRowClick(record.mobile)} className="cursor-pointer">
                            <TableCell className="font-medium">{highlightMatch(record.mobile, searchTerm)}</TableCell>
                            <TableCell><Badge variant="secondary">{record.currentStage}</Badge></TableCell>
                            <TableCell>
                                {record.rtpStatus !== 'N/A' ? (
                                    <Badge variant={record.rtpStatus === 'RTP' ? 'default' : 'destructive'} className={record.rtpStatus === 'RTP' ? `bg-green-500/20 text-green-700` : `bg-red-500/20 text-red-700`}>{record.rtpStatus}</Badge>
                                ) : 'N/A'}
                            </TableCell>
                            <TableCell>{record.purchaseInfo?.purchaseFrom || 'N/A'}</TableCell>
                            <TableCell>{record.saleInfo?.saleDate ? format(record.saleInfo.saleDate.toDate(), 'PPP') : 'N/A'}</TableCell>
                        </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center">
                                {searchTerm ? `No history found for "${searchTerm}".` : "No number history found."}
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
                totalItems={filteredHistory.length}
            />
            {selectedMobile && (
                <LifecycleHistoryModal 
                    isOpen={isHistoryModalOpen}
                    onClose={() => setIsHistoryModalOpen(false)}
                    mobileNumber={selectedMobile}
                />
            )}
        </CardContent>
    </Card>
  );
}
