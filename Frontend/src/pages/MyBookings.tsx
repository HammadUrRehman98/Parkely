import { useEffect, useState } from 'react';
import { api } from '@/lib/backend';
import { Booking } from '@/types/parking';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';

const statusColors: Record<string, string> = {
  active: 'bg-green-500/10 text-green-700 border-green-200',
  upcoming: 'bg-blue-500/10 text-blue-700 border-blue-200',
  completed: 'bg-muted text-muted-foreground',
  cancelled: 'bg-destructive/10 text-destructive border-destructive/20',
};

const MyBookings = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.getMyBookings();
        setBookings(data);
      } catch (error) {
        toast({
          title: 'Could not load bookings',
          description: error instanceof Error ? error.message : 'Please try again.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [toast]);

  const handleCancel = async (bookingId: string) => {
    try {
      const updated = await api.cancelBooking(bookingId);
      setBookings((current) => current.map((booking) => (booking.id === updated.id ? updated : booking)));
      toast({ title: 'Booking cancelled', description: 'The slot has been released.' });
    } catch (error) {
      toast({
        title: 'Could not cancel booking',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">My Bookings</h1>
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <p className="px-4 py-8 text-sm text-muted-foreground">Loading bookings...</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Zone</TableHead>
                    <TableHead>Slot</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookings.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium">{b.zoneName}</TableCell>
                      <TableCell>{b.slotLabel}</TableCell>
                      <TableCell>{b.date}</TableCell>
                      <TableCell>{b.startTime} – {b.endTime}</TableCell>
                      <TableCell>{b.duration}h</TableCell>
                      <TableCell>${b.totalCost}</TableCell>
                      <TableCell className="font-mono text-xs">{b.vehicleNumber}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusColors[b.status]}>
                          {b.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {b.status !== 'cancelled' && (
                          <Button variant="outline" size="sm" onClick={() => void handleCancel(b.id)}>
                            Cancel
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {!bookings.length && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground py-10">
                        No bookings yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default MyBookings;
