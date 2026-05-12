import { useLocation, Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Map, CalendarCheck } from 'lucide-react';
import { formatPKR } from '@/lib/currency';

const BookingConfirmation = () => {
  const location = useLocation();
  const data = location.state as any;

  return (
    <AppLayout>
      <div className="max-w-lg mx-auto py-10">
        <Card>
          <CardHeader className="text-center">
            <div className="h-16 w-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl">Booking Confirmed!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {data && (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Zone</span><p className="font-medium">{data.zoneName}</p></div>
                <div><span className="text-muted-foreground">Slot</span><p className="font-medium">{data.slotLabel}</p></div>
                <div><span className="text-muted-foreground">Date</span><p className="font-medium">{data.date}</p></div>
                <div><span className="text-muted-foreground">Time</span><p className="font-medium">{data.startTime} ({data.duration}h)</p></div>
                <div><span className="text-muted-foreground">Total</span><p className="font-medium text-lg">{formatPKR(Number(data.totalCost))}</p></div>
              </div>
            )}
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" asChild>
                <Link to="/parking-finder"><Map className="mr-2 h-4 w-4" />View Map</Link>
              </Button>
              <Button className="flex-1" asChild>
                <Link to="/dashboard"><CalendarCheck className="mr-2 h-4 w-4" />My Bookings</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default BookingConfirmation;
