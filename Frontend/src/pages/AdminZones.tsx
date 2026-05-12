import { Fragment, useEffect, useState } from 'react';
import { api } from '@/lib/backend';
import { ParkingZone, SlotStatus } from '@/types/parking';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { ParkingLayout } from '@/components/ParkingLayout';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { formatPKR } from '@/lib/currency';

const AdminZones = () => {
  const [zones, setZones] = useState<ParkingZone[]>([]);
  const [expandedZone, setExpandedZone] = useState<string | null>(null);
  const { toast: showToast } = useToast();
  const navigate = useNavigate();

  const loadZones = async () => {
    try {
      const data = await api.getZones();
      setZones(data);
    } catch (error) {
      showToast({
        title: 'Could not load zones',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    void loadZones();
  }, []);

  const handleDelete = async (id: string) => {
    try {
      await api.deleteZone(id);
      showToast({ title: 'Zone deleted' });
      await loadZones();
    } catch (error) {
      showToast({
        title: 'Could not delete zone',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleSlotStatus = async (slotId: string, status: SlotStatus) => {
    try {
      await api.updateSlotStatus(slotId, status);
      await loadZones();
    } catch (error) {
      showToast({
        title: 'Could not update slot',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Parking Zones</h1>
          <Button onClick={() => navigate('/admin/zones/new')}>
            <Plus className="h-4 w-4 mr-2" />Add Zone
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Zone</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Available</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {zones.map((zone) => (
                  <Fragment key={zone.id}>
                    <TableRow className="cursor-pointer" onClick={() => setExpandedZone(expandedZone === zone.id ? null : zone.id)}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: zone.color }} />
                          {zone.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{zone.address}</TableCell>
                      <TableCell>{zone.capacity}</TableCell>
                      <TableCell><Badge variant="outline">{zone.availableSlots}</Badge></TableCell>
                      <TableCell>{formatPKR(zone.pricePerHour)}/hr</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); navigate(`/admin/zones/${zone.id}/edit`); }}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); void handleDelete(zone.id); }}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                          {expandedZone === zone.id ? <ChevronUp className="h-4 w-4 mt-2.5" /> : <ChevronDown className="h-4 w-4 mt-2.5" />}
                        </div>
                      </TableCell>
                    </TableRow>
                    {expandedZone === zone.id && (
                      <TableRow>
                        <TableCell colSpan={6} className="bg-muted/30 p-4 space-y-4">
                          <p className="text-sm font-medium">
                            Parking Layout — {zone.layoutTemplate} ({zone.slots.length} slots)
                          </p>
                          <ParkingLayout slots={zone.slots} template={zone.layoutTemplate} compact />
                          <div className="grid md:grid-cols-3 gap-3">
                            {zone.slots.slice(0, 9).map((slot) => (
                              <div key={slot.id} className="rounded-lg border p-3 space-y-2 bg-background">
                                <div className="flex items-center justify-between">
                                  <span className="font-medium text-sm">{slot.label}</span>
                                  <Badge variant="outline" className="capitalize">{slot.status}</Badge>
                                </div>
                                <Select value={slot.status} onValueChange={(value) => void handleSlotStatus(slot.id, value as SlotStatus)}>
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                  <SelectItem value="available">Available</SelectItem>
                                  <SelectItem value="booked">Booked</SelectItem>
                                  <SelectItem value="occupied">Occupied</SelectItem>
                                  <SelectItem value="hold">Hold</SelectItem>
                                  <SelectItem value="unavailable">Unavailable</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default AdminZones;
