import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/backend';
import { Booking, ParkingZone } from '@/types/parking';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { CalendarIcon, Download } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];

const AdminReports = () => {
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [zones, setZones] = useState<ParkingZone[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const load = async () => {
      try {
        const [zonesData, bookingsData] = await Promise.all([api.getZones(), api.getAllBookings()]);
        setZones(zonesData);
        setBookings(bookingsData);
      } catch (error) {
        toast({
          title: 'Could not load reports',
          description: error instanceof Error ? error.message : 'Please try again.',
          variant: 'destructive',
        });
      }
    };
    void load();
  }, [toast]);

  const revenueByZone = useMemo(
    () =>
      zones.map((zone) => ({
        zone: zone.name,
        revenue: bookings.filter((booking) => booking.zoneId === zone.id).reduce((sum, booking) => sum + booking.totalCost, 0),
      })).filter((item) => item.revenue > 0),
    [zones, bookings],
  );

  const dailyOccupancy = useMemo(
    () =>
      Array.from(
        bookings.reduce((map, booking) => {
          map.set(booking.date, (map.get(booking.date) || 0) + 1);
          return map;
        }, new Map<string, number>()),
      )
        .map(([date, rate]) => ({ date, rate }))
        .slice(0, 14),
    [bookings],
  );

  const peakHours = useMemo(
    () =>
      Array.from(
        bookings.reduce((map, booking) => {
          const hour = booking.startTime.slice(0, 2);
          map.set(hour, (map.get(hour) || 0) + 1);
          return map;
        }, new Map<string, number>()),
      )
        .map(([hour, bookings]) => ({ hour: `${hour}:00`, bookings }))
        .sort((a, b) => a.hour.localeCompare(b.hour)),
    [bookings],
  );

  const totalRev = revenueByZone.reduce((a, b) => a + b.revenue, 0);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Reports & Analytics</h1>
          <Button variant="outline"><Download className="h-4 w-4 mr-2" />Export CSV</Button>
        </div>

        <div className="flex gap-3 items-center">
          {(['Start', 'End'] as const).map((label, i) => {
            const val = i === 0 ? startDate : endDate;
            const setter = i === 0 ? setStartDate : setEndDate;
            return (
              <Popover key={label}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn('w-44 justify-start text-sm', !val && 'text-muted-foreground')}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {val ? format(val, 'PP') : `${label} Date`}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={val} onSelect={setter} className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            );
          })}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Revenue by Zone</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={revenueByZone}
                    dataKey="revenue"
                    nameKey="zone"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    label={({ zone, percent }) => `${zone.split(' ')[0]} ${(percent * 100).toFixed(0)}%`}
                  >
                    {revenueByZone.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Occupancy Trend</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={dailyOccupancy}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="rate" stroke="#3b82f6" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Bookings by Hour</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={peakHours}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="bookings" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Revenue Breakdown</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Zone</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead>Share</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {revenueByZone.map((r, i) => (
                  <TableRow key={r.zone}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                        {r.zone}
                      </div>
                    </TableCell>
                    <TableCell>${r.revenue.toLocaleString()}</TableCell>
                    <TableCell>{totalRev ? ((r.revenue / totalRev) * 100).toFixed(1) : '0.0'}%</TableCell>
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

export default AdminReports;
