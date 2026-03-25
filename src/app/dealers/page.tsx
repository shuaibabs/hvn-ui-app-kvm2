"use client";

import { useState, useMemo } from 'react';
import { useApp } from '@/context/app-context';
import { PageHeader } from '@/components/page-header';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Trash, Edit, Plus, Search } from 'lucide-react';
import { TableSpinner } from '@/components/ui/spinner';
import { format } from 'date-fns';
import { useAuth } from '@/context/auth-context';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { DealerRecord } from '@/lib/data';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export default function ManageDealersPage() {
    const { dealers, loading, addDealer, updateDealer, deleteDealer } = useApp();
    const { role } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');

    // Modals state
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newDealerName, setNewDealerName] = useState('');

    const [dealerToEdit, setDealerToEdit] = useState<DealerRecord | null>(null);
    const [editDealerName, setEditDealerName] = useState('');

    const [dealerToDelete, setDealerToDelete] = useState<DealerRecord | null>(null);

    const filteredDealers = useMemo(() => {
        return dealers.filter(d =>
            d.name.toLowerCase().includes(searchTerm.toLowerCase())
        ).sort((a, b) => a.name.localeCompare(b.name));
    }, [dealers, searchTerm]);

    const handleAdd = async () => {
        if (!newDealerName.trim()) return;
        await addDealer(newDealerName.trim());
        setNewDealerName('');
        setIsAddModalOpen(false);
    };

    const handleEditOpen = (dealer: DealerRecord) => {
        if (role !== 'admin') return;
        setDealerToEdit(dealer);
        setEditDealerName(dealer.name);
    };

    const handleEditSubmit = async () => {
        if (!dealerToEdit || !editDealerName.trim()) return;
        await updateDealer(dealerToEdit.id, editDealerName.trim());
        setDealerToEdit(null);
    };

    const handleDeleteConfirm = async () => {
        if (!dealerToDelete) return;
        await deleteDealer(dealerToDelete.id);
        setDealerToDelete(null);
    };

    return (
        <div className="flex flex-col gap-6 p-6">
            <PageHeader
                title="Manage Dealers"
                description="View and manage the master list of dealers for purchases."
            >
                <Button onClick={() => setIsAddModalOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Dealer
                </Button>
            </PageHeader>

            <div className="flex items-center gap-4">
                <div className="relative flex-1 sm:max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search dealers..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9"
                    />
                </div>
            </div>

            <div className="border rounded-lg bg-background shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow>
                            <TableHead className="w-16">Sr.No</TableHead>
                            <TableHead>Dealer Name</TableHead>
                            <TableHead className="w-32">Created Date</TableHead>
                            {role === 'admin' && <TableHead className="w-24 text-right">Actions</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableSpinner colSpan={role === 'admin' ? 4 : 3} />
                        ) : filteredDealers.length > 0 ? (
                            filteredDealers.map((dealer, index) => (
                                <TableRow key={dealer.id} className="hover:bg-muted/30 transition-colors">
                                    <TableCell>{index + 1}</TableCell>
                                    <TableCell className="font-medium">{dealer.name}</TableCell>
                                    <TableCell className="text-muted-foreground whitespace-nowrap text-xs">
                                        {dealer.createdAt ? format(dealer.createdAt.toDate(), 'dd-MM-yyyy') : 'N/A'}
                                    </TableCell>
                                    {role === 'admin' && (
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-1">
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => handleEditOpen(dealer)}>
                                                    <Edit className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => setDealerToDelete(dealer)}>
                                                    <Trash className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={role === 'admin' ? 4 : 3} className="h-32 text-center text-muted-foreground">
                                    No dealers found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Add Modal */}
            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add New Dealer</DialogTitle>
                        <DialogDescription>Enter the name of the new dealer to add to the master list.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Input
                            value={newDealerName}
                            onChange={e => setNewDealerName(e.target.value)}
                            placeholder="Dealer Name"
                            onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
                            autoFocus
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleAdd} disabled={!newDealerName.trim()}>Add Dealer</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Modal */}
            <Dialog open={!!dealerToEdit} onOpenChange={(open) => !open && setDealerToEdit(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Dealer</DialogTitle>
                        <DialogDescription>Change the name of the selected dealer.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Input
                            value={editDealerName}
                            onChange={e => setEditDealerName(e.target.value)}
                            placeholder="Dealer Name"
                            onKeyDown={e => { if (e.key === 'Enter') handleEditSubmit() }}
                            autoFocus
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDealerToEdit(null)}>Cancel</Button>
                        <Button onClick={handleEditSubmit} disabled={!editDealerName.trim() || editDealerName === dealerToEdit?.name}>Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={!!dealerToDelete} onOpenChange={(open) => !open && setDealerToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the dealer <strong>{dealerToDelete?.name}</strong> from the database.
                            Note: This will not remove the dealer name from past purchase records.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
