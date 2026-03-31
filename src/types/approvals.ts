export interface BookingRequester {
  name: string | null;
  position: string | null;
  email: string;
  phoneNumber: string | null;
}

export interface ApprovalBooking {
  id: string;
  endLocation: string | null;
  startTime: string | null;
  endTime: string | null;
  purpose: string | null;
  additionalNotes?: string | null;
  passengerCount: number | null;
  tripType: string | null;
  createdAt: string;
  requestForSelf?: boolean | null;
  travelerName?: string | null;
  travelerPosition?: string | null;
  travelerPhone?: string | null;
  requester: BookingRequester;
}

export interface ApprovalVehicle {
  id: string;
  licensePlate: string;
  brand: string | null;
  model: string | null;
  type: string | null;
  capacity: number | null;
  passengerCapacity: number | null;
}

export interface ApprovalDriver {
  id: string;
  name: string | null;
  email: string;
  position: string | null;
  role: string;
}

export interface DashboardCounts {
  pending: number;
  approved: number;
  inProgress: number;
}

export interface ApprovalDashboardData {
  counts: DashboardCounts;
  pendingBookings: ApprovalBooking[];
}

