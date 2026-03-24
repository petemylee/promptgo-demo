export interface TravelStatsSummary {
  totalKm: number;
  completedTrips: number;
  activeVehicles: number;
  activeDrivers: number;
  avgKmPerTrip: number;
}

export interface TravelStatsMeta {
  month: string;
  startDate: string;
  endDate: string;
  timezone: string;
  generatedAt: string;
  missingMileageTrips: number;
}

export interface TravelStatsVehicleKmItem {
  vehicleId: string;
  licensePlate: string;
  tripCount: number;
  totalKm: number;
}

export interface TravelStatsVehicleJobsItem {
  vehicleId: string;
  licensePlate: string;
  tripCount: number;
}

export interface TravelStatsDriverJobsItem {
  driverId: string;
  driverName: string;
  tripCount: number;
  totalKm: number;
}

export interface TravelStatsTripTrendItem {
  key: string;
  label: string;
  tripCount: number;
}

export interface TravelStatsDistanceDurationTrendItem {
  month: string;
  label: string;
  totalKm: number;
  totalDurationHours: number;
}

export interface TravelStatsResponse {
  summary: TravelStatsSummary;
  byVehicleKm: TravelStatsVehicleKmItem[];
  byVehicleJobs: TravelStatsVehicleJobsItem[];
  byDriverJobs: TravelStatsDriverJobsItem[];
  tripTrendByDay: TravelStatsTripTrendItem[];
  tripTrendByWeek: TravelStatsTripTrendItem[];
  tripTrendByMonth: TravelStatsTripTrendItem[];
  distanceVsDurationByMonth: TravelStatsDistanceDurationTrendItem[];
  meta: TravelStatsMeta;
}
