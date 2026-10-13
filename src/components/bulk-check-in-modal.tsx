"use client";

import { useEffect, useMemo, useState } from 'react';
import { useApp } from '@/context/app-context';
import { analyzeCheckInEntries, checkInDateFromInput } from '@/lib/number-actions';
import { indiaDay } from '@/lib/system-reminders';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';

export function BulkCheckInModal({ isOpen, onClose, initialMobiles = [] }: {
  isOpen: boolean; onClose: () => void; initialMobiles?: string[];
}) {
  const { numbers, bulkUpdateCheckInDate, loading } = useApp();
  const [input, setInput] = useState('');
  const [date, setDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  // Populate from a row/selection once when this dialog opens.
  useEffect(() => { if (isOpen) { setInput(initialMobiles.join('\n')); setDate(indiaDay(new Date())!); setError(''); } }, [isOpen]);
  const analysis = useMemo(() => analyzeCheckInEntries(input, numbers), [input, numbers]);
  const chosenDate = checkInDateFromInput(date);
  const valid = analysis.filter(entry => entry.number);
  const changed = valid.filter(entry => chosenDate && entry.number!.checkInDate?.toMillis() !== chosenDate.getTime());
  const submit = async () => {
    if (!chosenDate) return;
    setSaving(true); setError('');
    try { await bulkUpdateCheckInDate(changed.map(entry => entry.number!.id), chosenDate); onClose(); }
    catch (error) { setError(error instanceof Error ? error.message : 'Unable to update check-in dates.'); }
    finally { setSaving(false); }
  };
  return <Dialog open={isOpen} onOpenChange={() => { if (!saving) onClose(); }}>
    <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle>Bulk Check-In Date</DialogTitle><DialogDescription>Enter mobile numbers separated by commas or new lines, then review the dates that will be replaced.</DialogDescription></DialogHeader>
      <div className="space-y-4">
        <div className="space-y-2"><Label htmlFor="check-in-mobiles">Mobile Numbers</Label><Textarea id="check-in-mobiles" value={input} onChange={event => setInput(event.target.value)} rows={4} disabled={saving} placeholder={'9876543210, 9123456789\n9988776655'} /></div>
        <div className="space-y-2"><Label htmlFor="check-in-date">New Check-In Date (IST)</Label><Input id="check-in-date" type="date" value={date} onChange={event => setDate(event.target.value)} disabled={saving} /></div>
        <p className="text-sm text-muted-foreground">{changed.length} will change; {valid.length - changed.length} unchanged; {analysis.length - valid.length} invalid, duplicate, or unavailable. Only valid changes will be submitted.</p>
        <div className="max-h-64 overflow-auto border rounded-lg"><Table><TableHeader><TableRow><TableHead>Mobile</TableHead><TableHead>Current Location</TableHead><TableHead>Current Date</TableHead><TableHead>Result / New Date</TableHead></TableRow></TableHeader>
          <TableBody>{analysis.map((entry, index) => <TableRow key={`${entry.mobile}-${index}`}><TableCell>{entry.mobile}</TableCell><TableCell>{entry.number?.currentLocation || '—'}</TableCell><TableCell>{indiaDay(entry.number?.checkInDate) || 'Not set'}</TableCell><TableCell className={entry.issue ? 'text-destructive' : ''}>{entry.issue || (!chosenDate ? 'Choose a valid date' : entry.number!.checkInDate?.toMillis() === chosenDate.getTime() ? 'Unchanged' : `${date} (IST)`)}</TableCell></TableRow>)}</TableBody>
        </Table></div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      </div>
      <DialogFooter><Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button><Button onClick={submit} disabled={saving || loading || !chosenDate || !changed.length}>{saving ? 'Saving...' : `Set Date for ${changed.length} Number(s)`}</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}
