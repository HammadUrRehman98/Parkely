export type UserRole = 'user' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  is_email_verified?: boolean;
  vehicleNumber?: string;
  vehicleType?: string;
  avatar?: string;
}

export type SlotStatus = 'available' | 'booked' | 'occupied' | 'hold' | 'unavailable';

export interface ParkingSlot {
  id: string;
  label: string;
  status: SlotStatus;
  zoneId: string;
}

export type LayoutTemplate = '2-row' | '4-row' | 'l-shaped' | 'grid';

export interface ParkingZone {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  entranceLat?: number;
  entranceLng?: number;
  exitLat?: number;
  exitLng?: number;
  capacity: number;
  availableSlots: number;
  pricePerHour: number;
  slots: ParkingSlot[];
  polygon: [number, number][];
  color: string;
  layoutTemplate: LayoutTemplate;
}

export type BookingStatus = 'active' | 'completed' | 'cancelled' | 'upcoming';

export interface Booking {
  id: string;
  userId: string;
  zoneId: string;
  zoneName: string;
  slotId: string;
  slotLabel: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  totalCost: number;
  status: BookingStatus;
  vehicleNumber: string;
  arrivalConfirmedAt?: string;
  holdUntil?: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'booking' | 'alert' | 'info';
  read: boolean;
  createdAt: string;
}

export interface AnalyticsData {
  totalZones: number;
  totalSlots: number;
  occupancyRate: number;
  totalRevenue: number;
  dailyOccupancy: { date: string; rate: number }[];
  revenueByZone: { zone: string; revenue: number }[];
  peakHours: { hour: string; bookings: number }[];
}
