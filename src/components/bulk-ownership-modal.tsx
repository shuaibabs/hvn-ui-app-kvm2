"use client";

import { useEffect, useState } from 'react';
import { useApp } from '@/context/app-context';
import type { NumberRecord } from '@/lib/data';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';

export function BulkOwnershipModal({ isOpen, onClose, selectedNumbers }: {
  isOpen: boolean; onClose: () => void; selectedNumbers: NumberRecord[];
}) {
  const { bulkUpdateOwnership } = useApp();
  const [ownership, setOwnership] = useState<'Individual' | 'Partnership'>('Individual');
  const [partner, setPartner] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { if (isOpen) { setError(''); setPartner(''); setOwnership('Individual'); } }, [isOpen]);
  const partnerName = ownership === 'Partnership' ? partner.trim() : '';
  const changed = selectedNumbers.filter(number => number.ownershipType !== ownership || (number.partnerName || '') !== partnerName);
  const submit = async () => {
    setSaving(true); setError('');
    try { await bulkUpdateOwnership(changed.map(number => number.id), ownership, partnerName); onClose(); }
    catch (error) { setError(error instanceof Error ? error.message : 'Unable to update ownership.'); }
    finally { setSaving(false); }
  };
  return <Dialog open={isOpen} onOpenChange={() => { if (!saving) onClose(); }}>
    <DialogContent className="sm:max-w-xl">
      <DialogHeader><DialogTitle>Change Ownership</DialogTitle><DialogDescription>Review ownership changes for {selectedNumbers.length} selected number(s).</DialogDescription></DialogHeader>
      <div className="space-y-4">
        <div className="space-y-2"><Label htmlFor="bulk-ownership">Ownership Type</Label>
          <Select value={ownership} onValueChange={value => setOwnership(value as typeof ownership)} disabled={saving}>
            <SelectTrigger id="bulk-ownership"><SelectValue /></SelectTrigger><SelectContent>
              <SelectItem value="Individual">Individual</SelectItem><SelectItem value="Partnership">Partnership</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {ownership === 'Partnership' && <div className="space-y-2"><Label htmlFor="bulk-partner">Partner Name</Label><Input id="bulk-partner" value={partner} onChange={event => setPartner(event.target.value)} maxLength={120} disabled={saving} placeholder="Enter partner name" /></div>}
        <p className="text-sm text-muted-foreground">{changed.length} number(s) will change. {selectedNumbers.length - changed.length} already match. Individual ownership clears the partner name.</p>
        <div className="max-h-60 overflow-auto border rounded-lg"><Table><TableHeader><TableRow><TableHead>Mobile</TableHead><TableHead>Current Ownership</TableHead><TableHead>New Ownership</TableHead></TableRow></TableHeader>
          <TableBody>{selectedNumbers.map(number => <TableRow key={number.id}><TableCell>{number.mobile}</TableCell><TableCell>{number.ownershipType}{number.partnerName ? ` (${number.partnerName})` : ''}</TableCell><TableCell>{ownership}{partnerName ? ` (${partnerName})` : ''}</TableCell></TableRow>)}</TableBody>
        </Table></div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      </div>
      <DialogFooter><Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button><Button onClick={submit} disabled={saving || !changed.length || (ownership === 'Partnership' && !partnerName)}>{saving ? 'Saving...' : `Update ${changed.length} Number(s)`}</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}
