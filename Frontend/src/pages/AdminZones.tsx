import { Fragment, useEffect, useState } from 'react';
import { api } from '@/lib/backend';
import { ParkingZone, SlotStatus, LayoutTemplate } from '@/types/parking';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { ParkingLayout, layoutTemplates } from '@/components/ParkingLayout';
import { useToast } from '@/hooks/use-toast';

const defaultForm = {
  name: '',
  address: '',
  latitude: 40.7128,
  longitude: -74.006,
  capacity: 20,
  pricePerHour: 5,
  layoutTemplate: '2-row' as LayoutTemplate,
  color: '#3b82f6',
  slotPrefix: 'A',
};

const buildPolygon = (latitude: number, longitude: number) => ([
  { lat: latitude + 0.001, lng: longitude - 0.001 },
  { lat: latitude + 0.001, lng: longitude + 0.001 },
  { lat: latitude - 0.001, lng: longitude + 0.001 },
  { lat: latitude - 0.001, lng: longitude - 0.001 },
]);

const AdminZones = () => {
  const [zones, setZones] = useState<ParkingZone[]>([]);
  const [expandedZone, setExpandedZone] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<ParkingZone | null>(null);
  const [form, setForm] = useState(defaultForm);
  const { toast: showToast } = useToast();

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

  const openCreate = () => {
    setEditingZone(null);
    setForm(defaultForm);
    setDialogOpen(true);
  };

  const openEdit = (zone: ParkingZone) => {
    setEditingZone(zone);
    setForm({
      name: zone.name,
      address: zone.address,
      latitude: zone.lat,
      longitude: zone.lng,
      capacity: zone.capacity,
      pricePerHour: zone.pricePerHour,
      layoutTemplate: zone.layoutTemplate,
      color: zone.color,
      slotPrefix: zone.slots[0]?.label.replace(/\d+$/, '') || 'A',
    });
    setDialogOpen(true);
  };

  const saveZone = async () => {
    const payload = {
      name: form.name,
      address: form.address,
      latitude: form.latitude,
      longitude: form.longitude,
      capacity: form.capacity,
      price_per_hour: form.pricePerHour,
      color: form.color,
      layout_template: form.layoutTemplate,
      polygon: buildPolygon(form.latitude, form.longitude),
      slot_prefix: form.slotPrefix,
    };

    try {
      if (editingZone) {
        await api.updateZone(editingZone.id, {
          name: form.name,
          address: form.address,
          latitude: form.latitude,
          longitude: form.longitude,
          capacity: form.capacity,
          price_per_hour: form.pricePerHour,
          color: form.color,
          layout_template: form.layoutTemplate,
          polygon: buildPolygon(form.latitude, form.longitude),
        });
        showToast({ title: 'Zone updated', description: `${form.name} has been updated.` });
      } else {
        await api.createZone(payload);
        showToast({ title: 'Zone created', description: `${form.name} has been created.` });
      }
      setDialogOpen(false);
      await loadZones();
    } catch (error) {
      showToast({
        title: 'Could not save zone',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    }
  };

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
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Add Zone</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editingZone ? 'Edit Zone' : 'Add New Zone'}</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Zone Name</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. City Center" />
                </div>
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="e.g. 123 Main St" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Latitude</Label>
                    <Input type="number" step="0.0001" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: Number(e.target.value) })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Longitude</Label>
                    <Input type="number" step="0.0001" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: Number(e.target.value) })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Capacity</Label>
                    <Input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Price/Hour ($)</Label>
                    <Input type="number" value={form.pricePerHour} onChange={(e) => setForm({ ...form, pricePerHour: Number(e.target.value) })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Layout Template</Label>
                    <Select value={form.layoutTemplate} onValueChange={(v) => setForm({ ...form, layoutTemplate: v as LayoutTemplate })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {layoutTemplates.map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Color</Label>
                    <Input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} placeholder="#3b82f6" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Slot Prefix</Label>
                  <Input value={form.slotPrefix} onChange={(e) => setForm({ ...form, slotPrefix: e.target.value })} placeholder="A" />
                </div>
                <div className="space-y-2">
                  <Label>Layout Preview</Label>
                  <ParkingLayout
                    slots={Array.from({ length: Math.min(form.capacity, 30) }, (_, i) => ({
                      id: `preview-s${i + 1}`,
                      label: `${form.slotPrefix}${i + 1}`,
                      status: 'available' as SlotStatus,
                      zoneId: 'preview',
                    }))}
                    template={form.layoutTemplate}
                    compact
                  />
                </div>
                <Button className="w-full" onClick={saveZone} disabled={!form.name || !form.address}>
                  {editingZone ? 'Save Changes' : 'Create Zone'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
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
                      <TableCell>${zone.pricePerHour}/hr</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); openEdit(zone); }}>
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
