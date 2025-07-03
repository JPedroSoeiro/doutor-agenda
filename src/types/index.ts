// src/types/index.ts

export interface Clinic {
  id: string;
  name: string;
  address?: string | null;
  phoneNumber?: string;
  email?: string;
}

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  availableFromWeekDay: number;
  availableToWeekDay: number;
  availableFromTime: string;
  availableToTime: string;
  appointmentPriceInCents: number;
  is_active: boolean;
}

export interface TimeSlot {
  time: string;
  available: boolean;
}
