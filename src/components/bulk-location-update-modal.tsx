"use client";

import { useEffect, useMemo, useState } from 'react';
import { useApp } from '@/context/app-context';
import type { NumberRecord } from '@/lib/data';
import { analyzeNumberEntries } from '@/lib/number-actions';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';

export function BulkLocationUpdateModal({ isOpen, onClose }: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { numbers, bulkUpdateNumberLocation, loading } = useApp();
  const [input, setInput] = useState('');
  const [locationType, setLocationType] = useState<NumberRecord['locationType']>('Store');
  const [location, setLocation] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setInput('');
      setLocationType('Store');
      setLocation('');
      setError('');
    }
  }, [isOpen]);

  const analysis = useMemo(() => analyzeNumberEntries(input, numbers), [input, numbers]);
  const currentLocation = location.trim();
  const valid = analysis.filter(entry => entry.number);
  const changed = valid.filter(entry => currentLocation && (
    entry.number!.currentLocation !== currentLocation || entry.number!.locationType !== locationType
  ));
  const unchanged = currentLocation ? valid.length - changed.length : 0;

  const submit = async () => {
    if (saving || loading || !currentLocation || !changed.length) return;
    setSaving(true);
    setError('');
    try {
      await bulkUpdateNumberLocation(changed.map(entry => entry.number!.id), { locationType, currentLocation });
      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to update locations.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => { if (!open && !saving) onClose(); }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Location Update</DialogTitle>
          <DialogDescription>Enter mobile numbers separated by commas or new lines, then review and update their location together.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bulk-location-mobiles">Mobile Numbers</Label>
            <Textarea id="bulk-location-mobiles" value={input} onChange={event => setInput(event.target.value)} rows={4} disabled={saving} placeholder={'9876543210, 9123456789\n9988776655'} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="bulk-location-type">New Location Type</Label>
              <Select value={locationType} onValueChange={value => setLocationType(value as NumberRecord['locationType'])} disabled={saving}>
                <SelectTrigger id="bulk-location-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Store">Store</SelectItem>
                  <SelectItem value="Employee">Employee</SelectItem>
                  <SelectItem value="Dealer">Dealer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bulk-location-name">New Current Location</Label>
              <Input id="bulk-location-name" value={location} onChange={event => setLocation(event.target.value)} disabled={saving} placeholder="e.g. Mumbai Store" />
            </div>
          </div>
          <p aria-live="polite" className="text-sm text-muted-foreground">
            {valid.length} valid; {changed.length} will change; {unchanged} unchanged; {analysis.length - valid.length} invalid, duplicate, or unavailable. Only valid changes will be submitted.
          </p>
          <div className="max-h-64 overflow-auto border rounded-lg">
            <Table>
              <TableHeader><TableRow><TableHead>Mobile</TableHead><TableHead>Current Location</TableHead><TableHead>Location Type</TableHead><TableHead>Result / New Location</TableHead></TableRow></TableHeader>
              <TableBody>
                {analysis.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Enter mobile numbers to validate and preview changes.</TableCell></TableRow>}
                {analysis.map((entry, index) => (
                  <TableRow key={`${entry.mobile}-${index}`}>
                    <TableCell>{entry.mobile}</TableCell>
                    <TableCell>{entry.number?.currentLocation || '—'}</TableCell>
                    <TableCell>{entry.number?.locationType || '—'}</TableCell>
                    <TableCell className={entry.issue ? 'text-destructive' : ''}>
                      {entry.issue || (!currentLocation ? 'Enter a new location' : entry.number!.currentLocation === currentLocation && entry.number!.locationType === locationType ? 'Unchanged' : `${currentLocation} (${locationType})`)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={submit} disabled={saving || loading || !currentLocation || !changed.length}>
            {saving ? 'Saving...' : `Update Location for ${changed.length} Number(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
