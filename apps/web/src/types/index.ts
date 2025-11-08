export interface Speaker {
  id?: number;
  name: string;
  bio?: string;
  email?: string;
  title?: string;
}

export interface Event {
  id?: number;
  title: string;
  description?: string;
  start_time?: string; // ISO
  end_time?: string;   // ISO
  location?: string;
  created_by?: number | null;
}

export interface Room {
  id?: number;
  name: string;
  capacity?: number;
  location?: string;
  layout?: string;
  equipment?: string;
}

export interface Attendee {
  id?: number;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  registration_status?: string;
}
