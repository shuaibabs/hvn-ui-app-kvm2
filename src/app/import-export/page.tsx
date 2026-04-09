
"use client";

import { useState } from 'react';
import { useApp } from '@/context/app-context';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { FileInput, FileOutput, Terminal, Download } from 'lucide-react';
import Papa from 'papaparse';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Spinner, TableSpinner } from '@/components/ui/spinner';
import { NumberRecord } from '@/lib/data';
import { Checkbox } from '@/components/ui/checkbox';
import { Pagination } from '@/components/pagination';
import { useAuth } from '@/context/auth-context';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


type FailedRecord = {
  record: any;
  reason: string;
};

const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50, 100, 250, 500, 1000, 5000];
const REQUIRED_HEADERS = ['Mobile', 'NumberType', 'PurchaseFrom', 'PurchasePrice', 'PurchaseDate', 'CurrentLocation', 'LocationType', 'Status', 'OwnershipType'];
const ALL_EXPECTED_HEADERS = [
  'Mobile', 'NumberType', 'PurchaseFrom', 'PurchasePrice', 'PurchaseDate', 
  'CurrentLocation', 'LocationType', 'Status', 'OwnershipType', 'AssignedTo', 
  'SalePrice', 'Notes', 'UploadStatus', 'PartnerName', 'RTPDate', 
  'SafeCustodyDate', 'AccountName', 'BillDate', 'PDBill'
];


export default function ImportExportPage() {
  const { numbers, addActivity, bulkAddNumbers, loading } = useApp();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ successCount: number; updatedCount: number; failedCount: number } | null>(null);
  const [failedRecords, setFailedRecords] = useState<FailedRecord[]>([]);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  const totalPages = Math.ceil(numbers.length / itemsPerPage);
  const paginatedNumbers = numbers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const exportToCsv = (dataToExport: NumberRecord[], fileName: string) => {
     const formattedData = dataToExport.map(n => ({
        "Mobile": n.mobile,
        "NumberType": n.numberType,
        "PurchaseFrom": n.purchaseFrom,
        "PurchasePrice": n.purchasePrice,
        "PurchaseDate": n.purchaseDate ? format(n.purchaseDate.toDate(), 'yyyy-MM-dd') : '',
        "CurrentLocation": n.currentLocation,
        "LocationType": n.locationType,
        "Status": n.status,
        "OwnershipType": n.ownershipType,
        "AssignedTo": n.assignedTo,
        "SalePrice": n.salePrice || '',
        "Notes": n.notes || '',
        "UploadStatus": n.uploadStatus,
        "PartnerName": n.partnerName || '',
        "RTPDate": n.rtpDate ? format(n.rtpDate.toDate(), 'yyyy-MM-dd') : '',
        "SafeCustodyDate": n.safeCustodyDate ? format(n.safeCustodyDate.toDate(), 'yyyy-MM-dd') : '',
        "AccountName": n.accountName || '',
        "BillDate": n.billDate ? format(n.billDate.toDate(), 'yyyy-MM-dd') : '',
        "PDBill": n.pdBill || 'No',
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

  const handleExportAll = () => {
    exportToCsv(numbers, 'numberflow_all_export.csv');
    addActivity({
        employeeName: user?.displayName || 'User',
        action: 'Exported Data',
        description: 'Exported All Numbers list to CSV.'
    });
    toast({
        title: "Export Successful",
        description: "All numbers have been exported to CSV.",
    });
  };

  const handleExportSelected = () => {
    const selectedData = numbers.filter(n => selectedRows.includes(n.id));
    if (selectedData.length === 0) {
      toast({
        variant: "destructive",
        title: "No numbers selected",
        description: "Please select at least one number to export.",
      });
      return;
    }
    exportToCsv(selectedData, 'numberflow_selected_export.csv');
     addActivity({
        employeeName: user?.displayName || 'User',
        action: 'Exported Data',
        description: `Exported ${selectedData.length} selected number(s) to CSV.`
    });
    toast({
        title: "Export Successful",
        description: `${selectedData.length} selected numbers have been exported to CSV.`,
    });
    setSelectedRows([]);
  }
  
  const handleImportClick = () => {
    document.getElementById('import-file-input')?.click();
  };

  const processImportedData = async (data: any[], fileName: string) => {
    // Debug: Log first few records to see what's being parsed
    console.log('[CSV PARSE DEBUG] Total records:', data.length);
    data.slice(0, 3).forEach((record, idx) => {
      console.log(`[CSV PARSE DEBUG] Record ${idx}:`, {
        Mobile: record.Mobile,
        Status: record.Status,
        StatusType: typeof record.Status,
        RTPDate: record.RTPDate,
        NumberType: record.NumberType,
        OwnershipType: record.OwnershipType
      });
    });
    
    const { successCount, updatedCount, failedRecords: newFailedRecords } = await bulkAddNumbers(data as any[]);
    
    setImportResult({ successCount, updatedCount, failedCount: newFailedRecords.length });
    setFailedRecords(newFailedRecords);
    setIsImporting(false);

    toast({
      title: "Import Complete",
      description: `${successCount} created, ${updatedCount} updated, ${newFailedRecords.length} failed.`,
      duration: 7000,
    });

    addActivity({
        employeeName: user?.displayName || 'User',
        action: 'Imported Data',
        description: `CSV Import from ${fileName}: ${data.length} attempted, ${successCount} created, ${updatedCount} updated, ${newFailedRecords.length} failed.`
    });
  }
  
  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportResult(null);
    setFailedRecords([]);

    const fileExtension = file.name.split('.').pop()?.toLowerCase();

    if (fileExtension === 'csv') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        transformHeader: header => header.trim(),
        complete: (results) => {
           const headers = results.meta.fields || [];
           
           // Debug: Log headers being parsed
           console.log('[CSV HEADERS DEBUG] Found headers:', headers);
           console.log('[CSV HEADERS DEBUG] Status column index:', headers.indexOf('Status'));
           
           const missingHeaders = REQUIRED_HEADERS.filter(h => !headers.includes(h));

            if (missingHeaders.length > 0) {
                setIsImporting(false);
                toast({
                    variant: 'destructive',
                    title: 'Missing Required Headers',
                    description: `Your CSV file is missing the following required columns: ${missingHeaders.join(', ')}. Please ensure all required headers are present.`,
                    duration: 10000,
                });
                return;
            }

            // Check for extra/unexpected headers
            const unexpectedHeaders = headers.filter(h => !ALL_EXPECTED_HEADERS.includes(h));
            if (unexpectedHeaders.length > 0) {
                toast({
                    variant: 'default',
                    title: 'Extra Headers Detected',
                    description: `Your CSV contains unexpected columns: ${unexpectedHeaders.join(', ')}. These will be ignored during import.`,
                    duration: 8000,
                });
            }

          processImportedData(results.data, file.name);
        },
        error: (error: any) => {
          setIsImporting(false);
          toast({
            variant: 'destructive',
            title: 'CSV Parse Error',
            description: error.message || 'Failed to parse CSV file. Please ensure it is a valid CSV format.',
          });
        },
      });
    } else {
        setIsImporting(false);
        toast({
            variant: 'destructive',
            title: 'Unsupported File Type',
            description: 'Please upload a .csv file. Other formats are not supported.',
        });
    }

    // Reset file input
    event.target.value = '';
  };

  const handleExportFailed = () => {
     if (failedRecords.length === 0) return;

     const dataToExport = failedRecords.map(item => ({
        ...item.record,
        ReasonForFailure: item.reason,
     }));

     const csv = Papa.unparse(dataToExport);
     const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
     const link = document.createElement('a');
     const url = URL.createObjectURL(blob);
     link.setAttribute('href', url);
     link.setAttribute('download', 'failed_import_report.csv');
     link.style.visibility = 'hidden';
     document.body.appendChild(link);
     link.click();
     document.body.removeChild(link);

     toast({
        title: "Failed Report Exported",
        description: "The list of failed records has been downloaded.",
     });
  }

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

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1);
  };

  return (
    <>
      {/* <PageHeader
        title="Manage Numbers via CSV"
        description="Bulk import to create numbers, and export your number inventory."
      /> */}
      <div className="text-xs text-muted-foreground mt-3 pb-2 space-y-1">
                  <p className="font-semibold">Required Headers:</p>
                  <p>Mobile, NumberType, PurchaseFrom, PurchasePrice, PurchaseDate, CurrentLocation, LocationType, Status, OwnershipType</p>
                  <p className="font-semibold mt-2">Optional Fields:</p>
                  <p>AssignedTo (defaults to "Unassigned" if employee not found), SalePrice, Notes, UploadStatus (Pending|Done), PartnerName (required if OwnershipType is "Partnership")</p>
                  <p className="font-semibold mt-2">Conditional Fields:</p>
                  <p><strong>For Non-RTP Status:</strong> RTPDate (dd-MM-yy format, required) - <em className="text-amber-600">Number will automatically become RTP when this date is reached</em></p>
                  <p><strong>For COCP Type:</strong> SafeCustodyDate (dd-MM-yy format, required), AccountName (required)</p>
                  <p><strong>For Postpaid Type:</strong> BillDate (dd-MM-yy format, required), PDBill (Yes|No, defaults to No)</p>
                  <p className="font-semibold mt-2">Date Format:</p>
                  <p>Recommended format: <code className="bg-muted px-1 rounded">dd-MM-yy</code> (e.g., 15-03-26 for March 15, 2026)</p>
                  <p>Also accepted: dd-MM-yyyy, MM-dd-yyyy, yyyy-MM-dd, MM/dd/yyyy, yyyy/MM/dd, M/d/yy, M/d/yyyy, MM/dd/yy</p>
                  <p className="font-semibold mt-2">Important Notes:</p>
                  <p>• <strong>Non-RTP Records:</strong> Once imported, the system automatically converts them to RTP on the specified RTPDate.</p>
                  <p>• <strong>Spaces are Trimmed:</strong> Leading/trailing spaces in names and text are automatically removed.</p>
                  <p>• <strong>Empty Cells:</strong> Leave optional fields blank/empty (not "N/A" or "NULL").</p>
                </div>
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <Card>
             <CardHeader>
                <CardTitle className="flex items-center gap-2"><FileInput className="w-5 h-5 text-primary" /> Import from CSV</CardTitle>
                <CardDescription>Upload a CSV file to add new numbers. Existing numbers will be skipped.</CardDescription>
             </CardHeader>
             <CardContent>
                <Button onClick={handleImportClick} disabled={isImporting}>
                  {isImporting ? <Spinner className="mr-2 h-4 w-4" /> : <FileInput className="mr-2 h-4 w-4" />}
                  {isImporting ? 'Importing...' : 'Import from CSV'}
                </Button>
                <input type="file" id="import-file-input" className="hidden" accept=".csv" onChange={handleFileImport} />
                
             </CardContent>
           </Card>
           <Card>
             <CardHeader>
                <CardTitle className="flex items-center gap-2"><FileOutput className="w-5 h-5 text-primary" /> Export to CSV</CardTitle>
                <CardDescription>Download a CSV file of your master number inventory.</CardDescription>
             </CardHeader>
             <CardContent className="flex flex-wrap gap-2">
                 <Button variant="outline" onClick={handleExportAll} disabled={loading}>
                    <FileOutput className="mr-2 h-4 w-4" />
                    Export All
                </Button>
                 <Button variant="default" onClick={handleExportSelected} disabled={loading || selectedRows.length === 0}>
                    <Download className="mr-2 h-4 w-4" />
                    Export Selected ({selectedRows.length})
                </Button>
             </CardContent>
           </Card>
        </div>

        {importResult && (
            <Alert variant={importResult.failedCount > 0 ? "destructive" : "default"} className={importResult.failedCount === 0 ? "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800" : ""}>
                <Terminal className="h-4 w-4" />
                <AlertTitle>{importResult.failedCount === 0 ? "✓ Import Successful" : "⚠ Import Completed with Errors"}</AlertTitle>
                <AlertDescription className="space-y-2">
                   <div>
                     <strong>Summary:</strong> {importResult.successCount} created, {importResult.updatedCount} updated, {importResult.failedCount} failed.
                   </div>
                   {failedRecords.length > 0 && (
                     <div>
                       <strong className="text-red-600">Failed Records Summary:</strong>
                       <ul className="text-xs mt-1 space-y-1 max-h-32 overflow-y-auto">
                         {failedRecords.slice(0, 5).map((record, idx) => (
                           <li key={idx} className="text-red-600">
                             • Mobile {record.record.Mobile}: {record.reason}
                           </li>
                         ))}
                         {failedRecords.length > 5 && <li className="text-red-600">... and {failedRecords.length - 5} more</li>}
                       </ul>
                       <Button variant="link" size="sm" className="pl-0 h-auto py-1 mt-2" onClick={handleExportFailed}>
                          <Download className="mr-1 h-3 w-3" />
                          Download detailed failed records report
                      </Button>
                     </div>
                   )}
                </AlertDescription>
            </Alert>
        )}

        <div>
          <h3 className="text-lg font-semibold mb-2">Select Numbers to Export</h3>
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-4 flex-wrap">
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
                <TableHead>Sum</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Upload Status</TableHead>
                <TableHead>Number Type</TableHead>
                <TableHead>Purchase From</TableHead>
                <TableHead>Purchase Price</TableHead>
                <TableHead>Sale Price</TableHead>
                <TableHead>RTP Date</TableHead>
                <TableHead>Location Type</TableHead>
                <TableHead>Current Location</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Purchase Date</TableHead>
                <TableHead>Ownership</TableHead>
                <TableHead>Partner Name</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableSpinner colSpan={17} />
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
                    <TableCell className="font-medium">{num.mobile}</TableCell>
                    <TableCell>{num.sum}</TableCell>
                    <TableCell>
                      <Badge variant={num.status === 'RTP' ? 'default' : 'destructive'} className={num.status === 'RTP' ? `bg-green-500/20 text-green-700` : `bg-red-500/20 text-red-700`}>{num.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={num.uploadStatus === 'Done' ? 'secondary' : 'outline'}>{num.uploadStatus}</Badge>
                    </TableCell>
                     <TableCell>{num.numberType}</TableCell>
                    <TableCell>{num.purchaseFrom}</TableCell>
                    <TableCell>₹{num.purchasePrice?.toLocaleString()}</TableCell>
                    <TableCell>₹{Number(num.salePrice)?.toLocaleString()}</TableCell>
                    <TableCell>{num.rtpDate ? format(num.rtpDate.toDate(), 'PPP') : 'N/A'}</TableCell>
                    <TableCell>{num.locationType}</TableCell>
                    <TableCell>{num.currentLocation}</TableCell>
                    <TableCell>{num.assignedTo}</TableCell>
                    <TableCell>{num.purchaseDate ? format(num.purchaseDate.toDate(), 'PPP') : 'N/A'}</TableCell>
                    <TableCell>{num.ownershipType}</TableCell>
                    <TableCell>{num.partnerName || 'N/A'}</TableCell>
                  </TableRow>
                ))
              ) : (
                 <TableRow>
                    <TableCell colSpan={17} className="h-24 text-center">
                        No numbers found.
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
            totalItems={numbers.length}
          />
      </div>
    </>
  );
}
