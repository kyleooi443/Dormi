export type Role = "admin" | "renter";
export type BillType = "electricity" | "wifi" | "water" | "rent";
export type PaymentStatus = "submitted" | "approved" | "rejected";

export interface Profile {
  id: string;
  household_id: string;
  username: string;
  full_name: string;
  email: string;
  role: Role;
  active: boolean;
  created_at: string;
}

export interface BillingPeriod {
  id: string;
  household_id: string;
  label: string;
  starts_on: string;
  ends_on: string;
  due_on: string;
  created_by: string;
  created_at: string;
}

export interface Bill {
  id: string;
  household_id: string;
  billing_period_id: string;
  type: BillType;
  title: string;
  amount: number;
  started_on: string;
  due_on: string;
  notes: string | null;
  source_image_path: string | null;
  created_by: string;
  created_at: string;
}

export interface StayDate {
  id: string;
  renter_id: string;
  billing_period_id: string;
  stay_date: string;
  created_at: string;
}

export interface Payment {
  id: string;
  bill_id: string;
  renter_id: string;
  amount: number;
  paid_on: string;
  status: PaymentStatus;
  receipt_path: string | null;
  note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export const BILL_TYPES: BillType[] = ["electricity", "wifi", "water", "rent"];
export const SHARED_TYPES: BillType[] = ["electricity", "wifi", "water"];

export const BILL_TYPE_LABELS: Record<BillType, string> = {
  electricity: "Electricity",
  wifi: "WiFi",
  water: "Water",
  rent: "Rent",
};
