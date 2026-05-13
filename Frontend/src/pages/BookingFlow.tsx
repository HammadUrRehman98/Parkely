import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '@/lib/backend';
import { ParkingZone, ParkingSlot } from '@/types/parking';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, CheckCircle2, ArrowLeft, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { ParkingLayout } from '@/components/ParkingLayout';
import { useAuth } from '@/contexts/AuthContext';
import { formatPKR } from '@/lib/currency';

const BookingFlow = () => {
  const { zoneId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [zone, setZone] = useState<ParkingZone | null>(null);
  const [slots, setSlots] = useState<ParkingSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState<Date>();
  const [startTime, setStartTime] = useState('10:00');
  const [duration, setDuration] = useState(2);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  useEffect(() => {
    const loadZone = async () => {
      if (!zoneId) return;
      try {
        const data = await api.getZone(zoneId);
        setZone(data);
        setSlots(data.slots);
      } catch {
        toast({ title: 'Zone not found', description: 'Please pick another parking zone.', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };
    void loadZone();
  }, [zoneId]);

  const selectedSlotData = useMemo(() => slots.find((s) => s.id === selectedSlot), [slots, selectedSlot]);
  const totalCost = useMemo(() => (zone ? zone.pricePerHour * duration : 0), [zone, duration]);

  if (loading) {
    return (
      <AppLayout>
        <div className="max-w-3xl mx-auto py-20 text-center text-muted-foreground">Loading booking details...</div>
      </AppLayout>
    );
  }

  if (!zone) {
    return (
      <AppLayout>
        <div className="text-center py-20">
          <p className="text-muted-foreground">Zone not found.</p>
          <Button className="mt-4" onClick={() => navigate('/parking-finder')}>Back to Map</Button>
        </div>
      </AppLayout>
    );
  }

  const handleConfirm = async () => {
    if (!date || !selectedSlotData) return;

    const [startHourRaw, startMinuteRaw] = startTime.split(':');
    const startHour = Number(startHourRaw);
    const startMinute = Number(startMinuteRaw);
    if (Number.isNaN(startHour) || Number.isNaN(startMinute)) {
      toast({
        title: 'Booking failed',
        description: 'Please choose a valid start time.',
        variant: 'destructive',
      });
      return;
    }

    // The backend stores bookings as a same-day date plus a time range.
    // Reject reservations that would roll into the next day instead of sending invalid times.
    const startDateTime = new Date(date);
    startDateTime.setHours(startHour, startMinute, 0, 0);
    const endDateTime = new Date(startDateTime);
    endDateTime.setHours(endDateTime.getHours() + duration);
    if (endDateTime.getDate() !== startDateTime.getDate()) {
      toast({
        title: 'Booking failed',
        description: 'Please choose a shorter duration or an earlier start time. Overnight bookings are not supported yet.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const booking = await api.reserveBooking({
        zone_id: zone.id,
        slot_id: selectedSlotData.id,
        date: format(date, 'yyyy-MM-dd'),
        start_time: startTime,
        end_time: format(endDateTime, 'HH:mm'),
        vehicle_number: user?.vehicleNumber || 'N/A',
      });
      toast({
        title: 'Booking confirmed',
        description: `${zone.name} - Slot ${selectedSlotData.label} on ${format(date, 'PPP')} at ${startTime}.`,
      });
      navigate('/booking-confirmation', {
        state: {
          zoneName: zone.name,
          slotLabel: selectedSlotData.label,
          date: format(date, 'PPP'),
          startTime,
          duration,
          totalCost,
          zoneId: zone.id,
          bookingId: booking.id,
          bookingStatus: booking.status,
        },
      });
    } catch (error) {
      toast({
        title: 'Booking failed',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Book Parking — {zone.name}</h1>
            <p className="text-muted-foreground text-sm">{zone.address}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {['Date & Time', 'Select Slot', 'Confirm'].map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div className={cn(
                'h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium',
                step > i + 1 ? 'bg-primary text-primary-foreground' : step === i + 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              )}>
                {step > i + 1 ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
              </div>
              <span className={cn('text-sm hidden sm:block', step === i + 1 ? 'font-medium' : 'text-muted-foreground')}>
                {label}
              </span>
              {i < 2 && <div className="w-8 h-px bg-border" />}
            </div>
          ))}
        </div>

        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Choose Date & Time</CardTitle>
              <CardDescription>Select when you need parking</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn('w-full justify-start', !date && 'text-muted-foreground')}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, 'PPP') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={date} onSelect={setDate} className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Time</Label>
                  <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Duration (hours)</Label>
                  <Input type="number" min={1} max={24} value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                Rate: <strong>{formatPKR(zone.pricePerHour)}/hr</strong> · Estimated: <strong>{formatPKR(totalCost)}</strong>
              </div>
              <Button className="w-full" onClick={() => setStep(2)} disabled={!date}>
                Next <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Select a Slot</CardTitle>
              <CardDescription>Click an available slot to select it</CardDescription>
            </CardHeader>
            <CardContent>
              <ParkingLayout
                slots={slots}
                template={zone.layoutTemplate}
                selectedSlot={selectedSlot}
                onSlotClick={(id) => setSelectedSlot(id)}
                interactive
              />
              <div className="flex gap-3 mt-6">
                <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                <Button className="flex-1" onClick={() => setStep(3)} disabled={!selectedSlot}>
                  Next <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Booking Summary</CardTitle>
              <CardDescription>Review and confirm your booking</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Zone</span><p className="font-medium">{zone.name}</p></div>
                <div><span className="text-muted-foreground">Slot</span><p className="font-medium">{selectedSlotData?.label}</p></div>
                <div><span className="text-muted-foreground">Date</span><p className="font-medium">{date ? format(date, 'PPP') : ''}</p></div>
                <div><span className="text-muted-foreground">Time</span><p className="font-medium">{startTime} ({duration}h)</p></div>
                <div><span className="text-muted-foreground">Vehicle</span><p className="font-medium">{user?.vehicleNumber || 'N/A'}</p></div>
                <div><span className="text-muted-foreground">Total Cost</span><p className="font-medium text-lg">{formatPKR(totalCost)}</p></div>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
                <Button className="flex-1" onClick={() => void handleConfirm()}>
                  <CheckCircle2 className="mr-2 h-4 w-4" /> Confirm Booking
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
};

export default BookingFlow;
