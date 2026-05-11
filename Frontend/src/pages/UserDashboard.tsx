import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/backend';
import { Booking } from '@/types/parking';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CalendarCheck, Map, Star, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const statusColors: Record<string, string> = {
  active: 'bg-green-500/10 text-green-700 border-green-200',
  upcoming: 'bg-blue-500/10 text-blue-700 border-blue-200',
  completed: 'bg-muted text-muted-foreground',
  cancelled: 'bg-destructive/10 text-destructive border-destructive/20',
};

const UserDashboard = () => {
  const { user } = useAuth();
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

  const activeBookings = bookings.filter((b) => b.status === 'active').length;
  const totalBookings = bookings.length;
  const favoriteZone = bookings[0]?.zoneName || 'No bookings yet';
  const zonesVisited = new Set(bookings.map((b) => b.zoneId)).size;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Welcome back, {user?.name}!</h1>
          <p className="text-muted-foreground">Here&apos;s your live parking overview</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { icon: Clock, label: 'Active Bookings', value: activeBookings, color: 'text-green-600' },
            { icon: CalendarCheck, label: 'Total Bookings', value: totalBookings, color: 'text-primary' },
            { icon: Star, label: 'Favorite Zone', value: favoriteZone, color: 'text-yellow-600' },
            { icon: Map, label: 'Zones Visited', value: zonesVisited, color: 'text-purple-600' },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="p-5 flex items-center gap-4">
                <div className="h-11 w-11 rounded-lg bg-muted flex items-center justify-center">
                  <s.icon className={`h-5 w-5 ${s.color}`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                  <p className="text-2xl font-bold">{s.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex gap-3">
          <Button asChild>
            <Link to="/parking-finder"><Map className="h-4 w-4 mr-2" />Find Parking</Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground py-8">Loading your bookings...</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Zone</TableHead>
                    <TableHead>Slot</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookings.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium">{b.zoneName}</TableCell>
                      <TableCell>{b.slotLabel}</TableCell>
                      <TableCell>{b.date}</TableCell>
                      <TableCell>{b.startTime} – {b.endTime}</TableCell>
                      <TableCell>${b.totalCost}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusColors[b.status]}>
                          {b.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!bookings.length && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
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

export default UserDashboard;
