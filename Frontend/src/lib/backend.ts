import { request } from '@/lib/api';
import { Booking, BookingStatus, LayoutTemplate, Notification, ParkingSlot, ParkingZone, SlotStatus, User } from '@/types/parking';

type BackendUser = {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  is_email_verified: boolean;
  vehicle_number?: string | null;
  vehicle_type?: string | null;
  avatar?: string | null;
};

type BackendSlot = {
  id: string;
  zone_id: string;
  label: string;
  status: SlotStatus;
};

type BackendZone = {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  entrance_latitude?: number | null;
  entrance_longitude?: number | null;
  exit_latitude?: number | null;
  exit_longitude?: number | null;
  capacity: number;
  available_slots: number;
  price_per_hour: number;
  color: string;
  layout_template: LayoutTemplate;
  polygon: { lat: number; lng: number }[];
  slots?: BackendSlot[];
};

type BackendBooking = {
  id: string;
  user_id: string;
  zone_id: string;
  zone_name?: string | null;
  slot_id: string;
  slot_label?: string | null;
  date: string;
  start_time: string;
  end_time: string;
  duration: number;
  total_cost: string | number;
  status: BookingStatus;
  vehicle_number: string;
  created_at: string;
  arrival_confirmed_at?: string | null;
  hold_until?: string | null;
};

type BackendNotification = {
  id: string;
  title: string;
  message: string;
  type: 'booking' | 'alert' | 'info';
  read: boolean;
  created_at: string;
};

export const toUser = (user: BackendUser): User => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  is_email_verified: user.is_email_verified,
  vehicleNumber: user.vehicle_number ?? undefined,
  vehicleType: user.vehicle_type ?? undefined,
  avatar: user.avatar ?? undefined,
});

export const toParkingZone = (zone: BackendZone): ParkingZone => ({
  id: zone.id,
  name: zone.name,
  address: zone.address,
  lat: zone.latitude,
  lng: zone.longitude,
  entranceLat: zone.entrance_latitude ?? undefined,
  entranceLng: zone.entrance_longitude ?? undefined,
  exitLat: zone.exit_latitude ?? undefined,
  exitLng: zone.exit_longitude ?? undefined,
  capacity: zone.capacity,
  availableSlots: zone.available_slots,
  pricePerHour: Number(zone.price_per_hour),
  color: zone.color,
  layoutTemplate: zone.layout_template,
  polygon: zone.polygon.map((point) => [point.lat, point.lng]),
  slots: (zone.slots ?? []).map((slot) => ({
    id: slot.id,
    label: slot.label,
    status: slot.status,
    zoneId: slot.zone_id,
  })),
});

export const toBooking = (booking: BackendBooking): Booking => ({
  id: booking.id,
  userId: booking.user_id,
  zoneId: booking.zone_id,
  zoneName: booking.zone_name ?? '',
  slotId: booking.slot_id,
  slotLabel: booking.slot_label ?? '',
  date: booking.date,
  startTime: booking.start_time,
  endTime: booking.end_time,
  duration: booking.duration,
  totalCost: Number(booking.total_cost),
  status: booking.status,
  vehicleNumber: booking.vehicle_number,
  arrivalConfirmedAt: booking.arrival_confirmed_at ?? undefined,
  holdUntil: booking.hold_until ?? undefined,
  createdAt: booking.created_at,
});

export const toNotification = (notification: BackendNotification): Notification => ({
  id: notification.id,
  title: notification.title,
  message: notification.message,
  type: notification.type,
  read: notification.read,
  createdAt: notification.created_at,
});

export const api = {
  async getMe(): Promise<User> {
    const data = await request<{ user: BackendUser }>('/auth/me');
    return toUser(data.user);
  },
  async getZones(query?: string): Promise<ParkingZone[]> {
    const path = query ? `/parking/zones?query=${encodeURIComponent(query)}` : '/parking/zones';
    const data = await request<BackendZone[]>(path);
    return data.map(toParkingZone);
  },
  async getZone(zoneId: string): Promise<ParkingZone> {
    const data = await request<BackendZone>(`/parking/zones/${zoneId}`);
    return toParkingZone(data);
  },
  async getZoneSlots(zoneId: string): Promise<ParkingSlot[]> {
    const data = await request<BackendSlot[]>(`/parking/zones/${zoneId}/slots`);
    return data.map((slot) => ({
      id: slot.id,
      label: slot.label,
      status: slot.status,
      zoneId: slot.zone_id,
    }));
  },
  async createZone(payload: {
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    entrance_latitude?: number;
    entrance_longitude?: number;
    exit_latitude?: number;
    exit_longitude?: number;
    capacity: number;
    price_per_hour: number;
    color: string;
    layout_template: LayoutTemplate;
    polygon: { lat: number; lng: number }[];
    slot_prefix: string;
  }): Promise<ParkingZone> {
    const data = await request<BackendZone>('/parking/zones', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return toParkingZone(data);
  },
  async updateZone(zoneId: string, payload: Partial<{
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    entrance_latitude: number;
    entrance_longitude: number;
    exit_latitude: number;
    exit_longitude: number;
    capacity: number;
    price_per_hour: number;
    color: string;
    layout_template: LayoutTemplate;
    polygon: { lat: number; lng: number }[];
  }>): Promise<ParkingZone> {
    const data = await request<BackendZone>(`/parking/zones/${zoneId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return toParkingZone(data);
  },
  async deleteZone(zoneId: string): Promise<void> {
    await request(`/parking/zones/${zoneId}`, { method: 'DELETE' });
  },
  async updateSlotStatus(slotId: string, status: SlotStatus): Promise<ParkingSlot> {
    const data = await request<BackendSlot>(`/parking/slots/${slotId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    return {
      id: data.id,
      label: data.label,
      status: data.status,
      zoneId: data.zone_id,
    };
  },
  async getMyBookings(): Promise<Booking[]> {
    const data = await request<BackendBooking[]>('/bookings/mine');
    return data.map(toBooking);
  },
  async getAllBookings(): Promise<Booking[]> {
    const data = await request<BackendBooking[]>('/bookings');
    return data.map(toBooking);
  },
  async reserveBooking(payload: {
    zone_id: string;
    slot_id: string;
    date: string;
    start_time: string;
    end_time: string;
    vehicle_number: string;
  }): Promise<Booking> {
    const data = await request<BackendBooking>('/bookings/reserve', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return toBooking(data);
  },
  async cancelBooking(bookingId: string): Promise<Booking> {
    const data = await request<BackendBooking>(`/bookings/${bookingId}/cancel`, {
      method: 'POST',
    });
    return toBooking(data);
  },
  async confirmBooking(bookingId: string): Promise<Booking> {
    const data = await request<BackendBooking>(`/bookings/${bookingId}/confirm`, {
      method: 'POST',
    });
    return toBooking(data);
  },
  async arriveBooking(bookingId: string): Promise<Booking> {
    const data = await request<BackendBooking>(`/bookings/${bookingId}/arrive`, { method: 'POST' });
    return toBooking(data);
  },
  async departBooking(bookingId: string): Promise<Booking> {
    const data = await request<BackendBooking>(`/bookings/${bookingId}/depart`, { method: 'POST' });
    return toBooking(data);
  },
  async claimHold(bookingId: string): Promise<Booking> {
    const data = await request<BackendBooking>(`/bookings/${bookingId}/claim-hold`, { method: 'POST' });
    return toBooking(data);
  },
  async getNotifications(): Promise<Notification[]> {
    const data = await request<BackendNotification[]>('/notifications/mine');
    return data.map(toNotification);
  },
  async markNotificationRead(notificationId: string): Promise<Notification> {
    const data = await request<BackendNotification>(`/notifications/${notificationId}/read`, {
      method: 'PATCH',
    });
    return toNotification(data);
  },
};
