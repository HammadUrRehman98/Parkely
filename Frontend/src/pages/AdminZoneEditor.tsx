import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '@/lib/backend';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ParkingLayout, layoutTemplates } from '@/components/ParkingLayout';
import { LayoutTemplate, SlotStatus } from '@/types/parking';
import { useToast } from '@/hooks/use-toast';
import { ZoneLocationPickerMap, ZonePoint } from '@/components/ZoneLocationPickerMap';

const metersToLatDelta = (meters: number) => meters / 111_320;
const metersToLngDelta = (meters: number, atLatitude: number) => meters / (111_320 * Math.cos((atLatitude * Math.PI) / 180));

const buildPolygon = (latitude: number, longitude: number, sizeMeters: number): ZonePoint[] => {
  const half = Math.max(10, sizeMeters) / 2;
  const dLat = metersToLatDelta(half);
  const dLng = metersToLngDelta(half, latitude);
  return [
    { lat: latitude + dLat, lng: longitude - dLng },
    { lat: latitude + dLat, lng: longitude + dLng },
    { lat: latitude - dLat, lng: longitude + dLng },
    { lat: latitude - dLat, lng: longitude - dLng },
  ];
};

const defaultForm = {
  name: '',
  address: '',
  latitude: 40.7128,
  longitude: -74.006,
  entranceLatitude: 40.7128,
  entranceLongitude: -74.006,
  exitLatitude: 40.7128,
  exitLongitude: -74.006,
  capacity: 20,
  pricePerHour: 5,
  layoutTemplate: '2-row' as LayoutTemplate,
  color: '#3b82f6',
  slotPrefix: 'A',
  zoneSizeMeters: 250,
  polygon: [] as ZonePoint[],
};

const AdminZoneEditor = () => {
  const { zoneId } = useParams();
  const editing = Boolean(zoneId);
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(defaultForm);

  const previewSlots = useMemo(
    () =>
      Array.from({ length: Math.min(form.capacity, 30) }, (_, i) => ({
        id: `preview-s${i + 1}`,
        label: `${form.slotPrefix}${i + 1}`,
        status: 'available' as SlotStatus,
        zoneId: 'preview',
      })),
    [form.capacity, form.slotPrefix],
  );

  useEffect(() => {
    const initCreateWithGeolocation = () => {
      if (editing) return;
      if (!('geolocation' in navigator)) return;
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setForm((current) => ({
            ...current,
            latitude: lat,
            longitude: lng,
            entranceLatitude: lat,
            entranceLongitude: lng,
            exitLatitude: lat,
            exitLongitude: lng,
            polygon: buildPolygon(lat, lng, current.zoneSizeMeters),
          }));
        },
        () => {
          // ignore
        },
        { enableHighAccuracy: true, maximumAge: 10_000, timeout: 10_000 },
      );
    };

    const load = async () => {
      try {
        if (!zoneId) {
          setForm({
            ...defaultForm,
            polygon: buildPolygon(defaultForm.latitude, defaultForm.longitude, defaultForm.zoneSizeMeters),
          });
          initCreateWithGeolocation();
          return;
        }

        const zone = await api.getZone(zoneId);
        setForm({
          name: zone.name,
          address: zone.address,
          latitude: zone.lat,
          longitude: zone.lng,
          entranceLatitude: zone.entranceLat ?? zone.lat,
          entranceLongitude: zone.entranceLng ?? zone.lng,
          exitLatitude: zone.exitLat ?? zone.lat,
          exitLongitude: zone.exitLng ?? zone.lng,
          capacity: zone.capacity,
          pricePerHour: zone.pricePerHour,
          layoutTemplate: zone.layoutTemplate,
          color: zone.color,
          slotPrefix: zone.slots[0]?.label.replace(/\d+$/, '') || 'A',
          zoneSizeMeters: defaultForm.zoneSizeMeters,
          polygon: zone.polygon.map(([lat, lng]) => ({ lat, lng })),
        });
      } catch (error) {
        toast({
          title: 'Could not load zone',
          description: error instanceof Error ? error.message : 'Please try again.',
          variant: 'destructive',
        });
        navigate('/admin/zones');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [editing, zoneId, toast, navigate]);

  const save = async () => {
    if (!form.name || !form.address) return;

    setSaving(true);
    try {
      const polygon = form.polygon.length ? form.polygon : buildPolygon(form.latitude, form.longitude, form.zoneSizeMeters);
      if (zoneId) {
        await api.updateZone(zoneId, {
          name: form.name,
          address: form.address,
          latitude: form.latitude,
          longitude: form.longitude,
          entrance_latitude: form.entranceLatitude,
          entrance_longitude: form.entranceLongitude,
          exit_latitude: form.exitLatitude,
          exit_longitude: form.exitLongitude,
          capacity: form.capacity,
          price_per_hour: form.pricePerHour,
          color: form.color,
          layout_template: form.layoutTemplate,
          polygon,
        });
        toast({ title: 'Zone updated', description: `${form.name} has been updated.` });
      } else {
        await api.createZone({
          name: form.name,
          address: form.address,
          latitude: form.latitude,
          longitude: form.longitude,
          entrance_latitude: form.entranceLatitude,
          entrance_longitude: form.entranceLongitude,
          exit_latitude: form.exitLatitude,
          exit_longitude: form.exitLongitude,
          capacity: form.capacity,
          price_per_hour: form.pricePerHour,
          color: form.color,
          layout_template: form.layoutTemplate,
          polygon,
          slot_prefix: form.slotPrefix,
        });
        toast({ title: 'Zone created', description: `${form.name} has been created.` });
      }
      navigate('/admin/zones');
    } catch (error) {
      toast({
        title: 'Could not save zone',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="max-w-6xl mx-auto py-20 text-center text-muted-foreground">Loading zone editor...</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{editing ? 'Edit Parking Zone' : 'Add Parking Zone'}</h1>
            <p className="text-sm text-muted-foreground">Set location, entrance/exit, pricing, and layout settings.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/admin/zones')}>Cancel</Button>
            <Button onClick={() => void save()} disabled={saving || !form.name || !form.address}>
              {saving ? 'Saving…' : 'Save Zone'}
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-[1fr_420px] gap-6">
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle>Location</CardTitle>
              <CardDescription>Click the map to place the zone, or drag the marker for exact placement.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ZoneLocationPickerMap
                latitude={form.latitude}
                longitude={form.longitude}
                zoneSizeMeters={form.zoneSizeMeters}
                polygon={form.polygon}
                color={form.color}
                onChange={(next) =>
                  setForm({
                    ...form,
                    latitude: next.latitude,
                    longitude: next.longitude,
                    polygon: next.polygon,
                  })}
              />
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Latitude</Label>
                  <Input
                    type="number"
                    step="0.0001"
                    value={form.latitude}
                    onChange={(e) => {
                      const nextLat = Number(e.target.value);
                      setForm({ ...form, latitude: nextLat, polygon: buildPolygon(nextLat, form.longitude, form.zoneSizeMeters) });
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Longitude</Label>
                  <Input
                    type="number"
                    step="0.0001"
                    value={form.longitude}
                    onChange={(e) => {
                      const nextLng = Number(e.target.value);
                      setForm({ ...form, longitude: nextLng, polygon: buildPolygon(form.latitude, nextLng, form.zoneSizeMeters) });
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Details</CardTitle>
                <CardDescription>Basic information shown to users.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
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
                    <Label>Price/Hour (PKR)</Label>
                    <Input type="number" value={form.pricePerHour} onChange={(e) => setForm({ ...form, pricePerHour: Number(e.target.value) })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Capacity</Label>
                    <Input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} />
                  </div>
                </div>
                {!editing && (
                  <div className="space-y-2">
                    <Label>Slot Prefix</Label>
                    <Input value={form.slotPrefix} onChange={(e) => setForm({ ...form, slotPrefix: e.target.value })} placeholder="A" />
                    <p className="text-xs text-muted-foreground">Used to label slots when the zone is created.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Entrance & Exit</CardTitle>
                <CardDescription>Optional coordinates for guidance and navigation.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Entrance Lat</Label>
                    <Input type="number" step="0.0001" value={form.entranceLatitude} onChange={(e) => setForm({ ...form, entranceLatitude: Number(e.target.value) })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Entrance Lng</Label>
                    <Input type="number" step="0.0001" value={form.entranceLongitude} onChange={(e) => setForm({ ...form, entranceLongitude: Number(e.target.value) })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Exit Lat</Label>
                    <Input type="number" step="0.0001" value={form.exitLatitude} onChange={(e) => setForm({ ...form, exitLatitude: Number(e.target.value) })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Exit Lng</Label>
                    <Input type="number" step="0.0001" value={form.exitLongitude} onChange={(e) => setForm({ ...form, exitLongitude: Number(e.target.value) })} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Layout & Styling</CardTitle>
                <CardDescription>Controls how the zone looks in the app.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
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
                  <Label>Zone Size (meters)</Label>
                  <Input
                    type="number"
                    min={50}
                    step={10}
                    value={form.zoneSizeMeters}
                    onChange={(e) => {
                      const nextSize = Number(e.target.value);
                      setForm({ ...form, zoneSizeMeters: nextSize, polygon: buildPolygon(form.latitude, form.longitude, nextSize) });
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Layout Preview</Label>
                  <ParkingLayout slots={previewSlots} template={form.layoutTemplate} compact />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default AdminZoneEditor;
