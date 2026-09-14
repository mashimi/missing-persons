// src/lib/types.ts
export interface Person {
  id: string;
  full_name: string;
  age: number | null;
  gender: "male" | "female" | "other" | "unknown";
  photo_url: string;
  last_seen_date: string; // ISO 8601
  last_seen_location: Location;
  status: "missing" | "found_alive" | "found_deceased" | "unknown";
  description: string;
  circumstances: string;
  family_contact: string | null; // may be encrypted / withheld
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface Location {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  region: string;
  district: string;
  country: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
}
