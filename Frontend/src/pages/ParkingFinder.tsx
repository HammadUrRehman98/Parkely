import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/backend';
import { ParkingZone } from '@/types/parking';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search } from 'lucide-react';
import { LeafletMap } from '@/components/LeafletMap';
import { useToast } from '@/hooks/use-toast';

const ParkingFinder = () => {
  const [search, setSearch] = useState('');
  const [zones, setZones] = useState<ParkingZone[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const loadZones = async () => {
      try {
        const data = await api.getZones();
        setZones(data);
      } catch (error) {
        toast({
          title: 'Could not load zones',
          description: error instanceof Error ? error.message : 'Please try again.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };
    void loadZones();
  }, [toast]);

  const filtered = useMemo(
    () => zones.filter((z) => z.name.toLowerCase().includes(search.toLowerCase()) || z.address.toLowerCase().includes(search.toLowerCase())),
    [zones, search],
  );

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Find Parking</h1>
        </div>

        <div className="grid lg:grid-cols-[320px_1fr] gap-4">
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search zones..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>

            <div className="space-y-3 max-h-[calc(100vh-260px)] overflow-auto">
              {loading && <p className="text-sm text-muted-foreground px-1 py-4">Loading zones...</p>}
              {!loading && filtered.map((zone) => (
                <Card key={zone.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold">{zone.name}</h3>
                        <p className="text-xs text-muted-foreground">{zone.address}</p>
                      </div>
                      <Badge
                        variant="outline"
                        className={zone.availableSlots > 10 ? 'bg-green-500/10 text-green-700 border-green-200' : 'bg-orange-500/10 text-orange-700 border-orange-200'}
                      >
                        {zone.availableSlots} free
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-sm font-medium">${zone.pricePerHour}/hr</span>
                      <Button size="sm" onClick={() => navigate(`/booking/${zone.id}`)}>
                        Book Now
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {!loading && !filtered.length && (
                <p className="text-sm text-muted-foreground px-1 py-4">No zones match your search.</p>
              )}
            </div>
          </div>

          <Card className="overflow-hidden">
            <CardContent className="p-0 h-[calc(100vh-200px)]">
              <LeafletMap
                center={[40.7128, -74.006]}
                zoom={14}
                zones={filtered}
                onZoneBook={(id) => navigate(`/booking/${id}`)}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

export default ParkingFinder;
