

"use client";

import { useState, useMemo } from 'react';
import { useApp } from '@/context/app-context';
import { PageHeader } from '@/components/page-header';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination } from '@/components/pagination';
import { Button } from '@/components/ui/button';
import { LogIn, MoreHorizontal, Edit } from 'lucide-react';
import { format } from 'date-fns';
import { TableSpinner } from '@/components/ui/spinner';
import { useAuth } from '@/context/auth-context';
import { NumberRecord } from '@/lib/data';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { EditLocationModal } from '@/components/edit-location-modal';
import { Input } from '@/components/ui/input';

const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50, 100, 250, 500, 1000, 5000];

export default function SimLocationsPage() {
  const { numbers, checkInNumber, loading } = useApp();
  const { user, role } = useAuth();
  const [locationTypeFilter, setLocationTypeFilter] = useState('all');
  const [currentLocationFilter, setCurrentLocationFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const currentLocationOptions = useMemo(() => {
    const allLocations = numbers.map(n => n.currentLocation).filter(Boolean);
    return [...new Set(['all', ...allLocations])];
  }, [numbers]);

  const filteredNumbers = useMemo(() => {
    return numbers
      .filter(num => locationTypeFilter === 'all' || num.locationType === locationTypeFilter)
      .filter(num => currentLocationFilter === 'all' || num.currentLocation === currentLocationFilter)
      .filter(num => num.mobile && num.mobile.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [numbers, locationTypeFilter, currentLocationFilter, searchTerm]);

  const totalPages = Math.ceil(filteredNumbers.length / itemsPerPage);
  const paginatedNumbers = filteredNumbers.slice(
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

  const selectedNumberRecords = numbers.filter(n => selectedRows.includes(n.id));

  const openLocationModal = (number?: NumberRecord) => {
    if (number) {
      setSelectedRows([number.id]);
    }
    setIsLocationModalOpen(true);
  }

  const closeLocationModal = () => {
    setIsLocationModalOpen(false);
    setSelectedRows([]);
  }

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
        title="SIM Location Tracking"
        description="Track the current location and assignment of all SIMs."
      >
      </PageHeader>
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-4">
        <div className="flex flex-col sm:flex-row items-center gap-4 flex-wrap w-full">
          <Input
            placeholder="Search by mobile number..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="max-w-full sm:max-w-xs"
          />
          <Select value={locationTypeFilter} onValueChange={setLocationTypeFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by location type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Location Types</SelectItem>
              <SelectItem value="Store">Store</SelectItem>
              <SelectItem value="Employee">Employee</SelectItem>
              <SelectItem value="Dealer">Dealer</SelectItem>
            </SelectContent>
          </Select>
          <Select value={currentLocationFilter} onValueChange={setCurrentLocationFilter}>
            <SelectTrigger className="w-full sm:w-[240px]">
              <SelectValue placeholder="Filter by Current Location" />
            </SelectTrigger>
            <SelectContent>
              {currentLocationOptions.map(location => (
                <SelectItem key={location} value={location}>
                  {location === 'all' ? 'All Current Locations' : location}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(itemsPerPage)} onValueChange={handleItemsPerPageChange}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Items per page" />
            </SelectTrigger>
            <SelectContent>
              {ITEMS_PER_PAGE_OPTIONS.map(val => (
                <SelectItem key={val} value={String(val)}>{val} / page</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedRows.length > 0 && (
            <Button variant="outline" onClick={() => openLocationModal()}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Location ({selectedRows.length})
            </Button>
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
              <TableHead>Sr.No</TableHead>
              <TableHead>Mobile</TableHead>
              <TableHead>Current Location</TableHead>
              <TableHead>Location Type</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead>Last Checked In</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableSpinner colSpan={8} />
            ) : paginatedNumbers.length > 0 ? (
              paginatedNumbers.map((num) => (
                <TableRow key={num.id} data-state={selectedRows.includes(num.id) && "selected"}>
                  <TableCell>
                    <Checkbox
                      checked={selectedRows.includes(num.id)}
                      onCheckedChange={() => handleSelectRow(num.id)}
                      aria-label="Select row"
                    />
                  </TableCell>
                  <TableCell>{num.srNo}</TableCell>
                  <TableCell className="font-medium">{highlightMatch(num.mobile, searchTerm)}</TableCell>
                  <TableCell>{num.currentLocation}</TableCell>
                  <TableCell>{num.locationType}</TableCell>
                  <TableCell>{num.assignedTo}</TableCell>
                  <TableCell>{num.checkInDate ? format(num.checkInDate.toDate(), 'PPP p') : 'N/A'}</TableCell>
                  <TableCell className="text-right">
                    <div className='flex items-center justify-end gap-2'>
                      <Button size="sm" variant="outline" onClick={() => checkInNumber(num.id)}>
                        <LogIn className="mr-2 h-4 w-4" />
                        Check In
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openLocationModal(num)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Location
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  {searchTerm ? `No SIMs found for "${searchTerm}".` : "No SIMs found for this filter."}
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
        totalItems={filteredNumbers.length}
      />
      <EditLocationModal
        isOpen={isLocationModalOpen}
        onClose={closeLocationModal}
        selectedNumbers={selectedNumberRecords}
      />
    </>
  );
}
