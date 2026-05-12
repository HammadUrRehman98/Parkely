import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/backend';
import { Booking, ParkingZone } from '@/types/parking';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { ParkingSquare, Layers, TrendingUp, DollarSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { LeafletMap } from '@/components/LeafletMap';
import { Button } from '@/components/ui/button';
import { formatPKR } from '@/lib/currency';

const AdminDashboard = () => {
  const [zones, setZones] = useState<ParkingZone[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const load = async () => {
      try {
        const [zonesData, bookingsData] = await Promise.all([api.getZones(), api.getAllBookings()]);
        setZones(zonesData);
        setBookings(bookingsData);
      } catch (error) {
        toast({
          title: 'Could not load dashboard data',
          description: error instanceof Error ? error.message : 'Please try again.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [toast]);

  const stats = useMemo(() => {
    const totalZones = zones.length;
    const totalSlots = zones.reduce((sum, zone) => sum + zone.capacity, 0);
    const occupiedSlots = zones.reduce((sum, zone) => sum + (zone.capacity - zone.availableSlots), 0);
    const occupancyRate = totalSlots ? Math.round((occupiedSlots / totalSlots) * 100) : 0;
    const totalRevenue = bookings.reduce((sum, booking) => sum + booking.totalCost, 0);

    const dailyOccupancy = Array.from(
      bookings.reduce((map, booking) => {
        map.set(booking.date, (map.get(booking.date) || 0) + 1);
        return map;
      }, new Map<string, number>()),
    )
      .map(([date, count]) => ({ date, rate: count }))
      .slice(0, 7);

    const peakHours = Array.from(
      bookings.reduce((map, booking) => {
        const hour = booking.startTime.slice(0, 2);
        map.set(hour, (map.get(hour) || 0) + 1);
        return map;
      }, new Map<string, number>()),
    )
      .map(([hour, count]) => ({ hour: `${hour}:00`, bookings: count }))
      .sort((a, b) => a.hour.localeCompare(b.hour));

    return { totalZones, totalSlots, occupancyRate, totalRevenue, dailyOccupancy, peakHours };
  }, [zones, bookings]);

  const mapCenter = useMemo<[number, number]>(() => {
    if (!zones.length) return [40.7128, -74.006];
    const avgLat = zones.reduce((sum, z) => sum + z.lat, 0) / zones.length;
    const avgLng = zones.reduce((sum, z) => sum + z.lng, 0) / zones.length;
    return [avgLat, avgLng];
  }, [zones]);

  const handleMarkArrived = async (bookingId: string) => {
    try {
      const updated = await api.arriveBooking(bookingId);
      setBookings((current) => current.map((b) => (b.id === updated.id ? updated : b)));
      toast({ title: 'Arrival confirmed', description: 'Slot marked as occupied.' });
    } catch (error) {
      toast({
        title: 'Could not confirm arrival',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleMarkDeparted = async (bookingId: string) => {
    try {
      const updated = await api.departBooking(bookingId);
      setBookings((current) => current.map((b) => (b.id === updated.id ? updated : b)));
      toast({ title: 'Departure confirmed', description: 'Slot released.' });
    } catch (error) {
      toast({
        title: 'Could not confirm departure',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { icon: ParkingSquare, label: 'Total Zones', value: stats.totalZones, color: 'text-primary' },
            { icon: Layers, label: 'Total Slots', value: stats.totalSlots, color: 'text-blue-500' },
            { icon: TrendingUp, label: 'Occupancy Rate', value: `${stats.occupancyRate}%`, color: 'text-green-600' },
            { icon: DollarSign, label: 'Total Revenue', value: formatPKR(stats.totalRevenue), color: 'text-yellow-600' },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="p-5 flex items-center gap-4">
                <div className="h-11 w-11 rounded-lg bg-muted flex items-center justify-center">
                  <s.icon className={`h-5 w-5 ${s.color}`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                  <p className="text-2xl font-bold">{loading ? '...' : s.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Weekly Occupancy</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={stats.dailyOccupancy}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Line type="monotone" dataKey="rate" stroke="hsl(225, 73%, 57%)" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Peak Hours</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={stats.peakHours}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="hour" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Bar dataKey="bookings" fill="hsl(225, 73%, 57%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <Card className="overflow-hidden">
          <CardHeader><CardTitle className="text-base">Zones Map</CardTitle></CardHeader>
          <CardContent className="p-0 h-[380px]">
            <LeafletMap center={mapCenter} zoom={13} zones={zones} fitToZones className="h-full w-full" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Recent Bookings</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Zone</TableHead>
                  <TableHead>Slot</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.slice(0, 10).map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-mono text-xs">{b.id}</TableCell>
                    <TableCell>{b.zoneName}</TableCell>
                    <TableCell>{b.slotLabel}</TableCell>
                    <TableCell>{b.date}</TableCell>
                    <TableCell>{formatPKR(b.totalCost)}</TableCell>
                    <TableCell><Badge variant="outline" className="capitalize">{b.status}</Badge></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {b.status === 'upcoming' && (
                          <Button size="sm" onClick={() => void handleMarkArrived(b.id)}>Mark Arrived</Button>
                        )}
                        {b.status === 'active' && (
                          <Button size="sm" variant="outline" onClick={() => void handleMarkDeparted(b.id)}>Mark Left</Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default AdminDashboard;
