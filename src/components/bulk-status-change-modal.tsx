"use client";

import { useEffect, useMemo, useState } from 'react';
import { useApp } from '@/context/app-context';
import { analyzeNumberEntries, checkInDateFromInput as dateFromInput } from '@/lib/number-actions';
import { indiaDay } from '@/lib/system-reminders';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';

export function BulkStatusChangeModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { numbers, bulkUpdateNumberStatus, loading } = useApp();
  const [input, setInput] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [status, setStatus] = useState<'RTP' | 'Non-RTP'>('RTP');
  const [date, setDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (isOpen) { setInput(''); setReviewing(false); setStatus('RTP'); setDate(''); setError(''); }
  }, [isOpen]);
  const analysis = useMemo(() => analyzeNumberEntries(input, numbers), [input, numbers]);
  const chosenDate = status === 'Non-RTP' ? dateFromInput(date) : null;
  const dateValid = status === 'RTP' || !!chosenDate && indiaDay(chosenDate)! > indiaDay(new Date())!;
  const valid = analysis.filter(entry => entry.number);
  const changed = valid.filter(({ number }) => dateValid && (
    number!.status !== status || (number!.rtpDate?.toMillis() ?? null) !== (chosenDate?.getTime() ?? null)
  ));
  const changedIds = new Set(changed.map(entry => entry.number!.id));
  const submit = async () => {
    if (!dateValid || !changed.length) return;
    setSaving(true); setError('');
    try {
      await bulkUpdateNumberStatus(changed.map(entry => entry.number!.id), status, chosenDate);
      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to update RTP status.');
    } finally { setSaving(false); }
  };

  return <Dialog open={isOpen} onOpenChange={() => { if (!saving) onClose(); }}>
    <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Bulk Status Change</DialogTitle>
        <DialogDescription>Enter mobile numbers separated by commas or new lines, then review and change their RTP status.</DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        {!reviewing ? <div className="space-y-2">
          <Label htmlFor="bulk-status-mobiles">Mobile Numbers</Label>
          <Textarea id="bulk-status-mobiles" value={input} onChange={event => setInput(event.target.value)} rows={6} placeholder={'9876543210, 9123456789\n9988776655'} />
        </div> : <>
          <div className="space-y-2">
            <Label htmlFor="bulk-rtp-status">New Status</Label>
            <Select value={status} onValueChange={value => { setStatus(value as 'RTP' | 'Non-RTP'); setError(''); }} disabled={saving}>
              <SelectTrigger id="bulk-rtp-status"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="RTP">RTP</SelectItem><SelectItem value="Non-RTP">Non-RTP</SelectItem></SelectContent>
            </Select>
          </div>
          {status === 'Non-RTP' && <div className="space-y-2">
            <Label htmlFor="bulk-rtp-date">Schedule RTP Date (IST)</Label>
            <Input id="bulk-rtp-date" type="date" value={date} min={indiaDay(new Date(Date.now() + 86400000))!} onChange={event => { setDate(event.target.value); setError(''); }} disabled={saving} />
            <p className="text-sm text-muted-foreground">Choose a future date for all entered Non-RTP numbers. They become RTP when that date arrives.</p>
          </div>}
          <p className="text-sm text-muted-foreground">
            {valid.length} valid; {analysis.length - valid.length} invalid, duplicate, or unavailable.
            {dateValid && ` ${changed.length} will change; ${valid.length - changed.length} unchanged.`} Only valid changes will be submitted.
          </p>
          <div className="max-h-64 overflow-auto border rounded-lg">
            <Table><TableHeader><TableRow><TableHead>Mobile</TableHead><TableHead>Current Status</TableHead><TableHead>Current RTP Date</TableHead><TableHead>Result / New Status</TableHead></TableRow></TableHeader>
              <TableBody>{analysis.map((entry, index) => <TableRow key={`${entry.mobile}-${index}`}>
                <TableCell>{entry.mobile}</TableCell>
                <TableCell>{entry.number?.status || '—'}</TableCell>
                <TableCell>{entry.number ? indiaDay(entry.number.rtpDate) || 'Not set' : '—'}</TableCell>
                <TableCell className={entry.issue ? 'text-destructive' : ''}>{entry.issue || (!dateValid ? 'Choose a future RTP date' : !changedIds.has(entry.number!.id) ? 'Unchanged' : status === 'RTP' ? 'RTP; clear RTP date' : `Non-RTP; RTP on ${date} (IST)`)}</TableCell>
              </TableRow>)}</TableBody>
            </Table>
          </div>
          {!dateValid && <p role="alert" className="text-sm text-destructive">A future RTP date is required for Non-RTP status.</p>}
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        </>}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
        {reviewing ? <>
          <Button variant="outline" onClick={() => { setReviewing(false); setError(''); }} disabled={saving}>Back</Button>
          <Button onClick={submit} disabled={saving || loading || !dateValid || !changed.length}>{saving ? 'Saving...' : `Update ${changed.length} Number(s)`}</Button>
        </> : <Button onClick={() => setReviewing(true)} disabled={loading || !input.trim()}>Review Numbers</Button>}
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}
