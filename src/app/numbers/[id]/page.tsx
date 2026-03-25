

'use client';

import { useParams } from 'next/navigation';
import { useApp } from '@/context/app-context';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ArrowLeft, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NumberRecord } from '@/lib/data';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { useNavigation } from '@/context/navigation-context';

function DetailItem({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="grid grid-cols-2 gap-2">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <div className="text-sm break-words">{value}</div>
    </div>
  );
}

export default function NumberDetailsPage() {
  const { id } = useParams();
  const { numbers, loading } = useApp();
  const { back, navigate } = useNavigation();

  const numberId = Array.isArray(id) ? id[0] : id;

  const number: NumberRecord | undefined = numbers.find(n => n.id === numberId);

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (!number) {
    return (
      <>
        <PageHeader title="Number Not Found" description="The requested number record could not be found." />
        <Button variant="outline" onClick={() => back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Go Back
        </Button>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Number Details"
        description={`Viewing full details for ${number.mobile}`}
      >
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button onClick={() => navigate(`/numbers/${number.id}/edit`)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
        </div>
      </PageHeader>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div>
              <CardTitle className="text-2xl">{number.mobile}</CardTitle>
              <CardDescription>Digital Root Sum: {number.sum}</CardDescription>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline">{number.numberType}</Badge>
              <Badge variant={number.status === 'RTP' ? 'default' : 'destructive'} className={number.status === 'RTP' ? `bg-green-500/20 text-green-700` : `bg-red-500/20 text-red-700`}>
                {number.status}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-x-8 gap-y-4">
            <DetailItem label="Assigned To" value={number.assignedTo} />
            <DetailItem label="Assigned Name" value={number.name} />
            {number.numberType === 'COCP' && <DetailItem label="Account Name" value={number.accountName} />}
          </div>

          <Separator />

          <div className="grid md:grid-cols-2 gap-x-8 gap-y-4">
            <h4 className="text-lg font-semibold col-span-full">Ownership Information</h4>
            <DetailItem label="Ownership Type" value={number.ownershipType} />
            {number.ownershipType === 'Partnership' && <DetailItem label="Partner Name" value={number.partnerName} />}
          </div>

          <Separator />

          <div className="grid md:grid-cols-2 gap-x-8 gap-y-4">
            <h4 className="text-lg font-semibold col-span-full">Purchase Information</h4>
            <DetailItem label="Purchased From" value={number.purchaseFrom} />
            <DetailItem label="Purchase Price" value={`₹${number.purchasePrice.toLocaleString()}`} />
            <DetailItem label="Purchase Date" value={number.purchaseDate ? format(number.purchaseDate.toDate(), 'PPP') : 'N/A'} />
            <DetailItem label="Sale Price" value={number.salePrice ? `₹${Number(number.salePrice).toLocaleString()}` : 'Not for sale'} />
          </div>

          <Separator />

          <div className="grid md:grid-cols-2 gap-x-8 gap-y-4">
            <h4 className="text-lg font-semibold col-span-full">Status & Location</h4>
            <DetailItem label="Scheduled RTP Date" value={number.rtpDate ? format(number.rtpDate.toDate(), 'PPP') : 'N/A'} />
            {number.numberType === 'COCP' && <DetailItem label="Safe Custody Date" value={number.safeCustodyDate ? format(number.safeCustodyDate.toDate(), 'PPP') : 'N/A'} />}
            {number.numberType === 'Postpaid' && <DetailItem label="Bill Date" value={number.billDate ? format(number.billDate.toDate(), 'PPP') : 'N/A'} />}
            {number.numberType === 'Postpaid' && <DetailItem label="PD Bill" value={number.pdBill} />}
            <DetailItem label="Current Location" value={number.currentLocation} />
            <DetailItem label="Location Type" value={number.locationType} />
          </div>

          {number.notes && (
            <>
              <Separator />
              <div>
                <h4 className="text-lg font-semibold">Notes</h4>
                <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">{number.notes}</p>
              </div>
            </>
          )}

        </CardContent>
      </Card>
    </>
  );
}
