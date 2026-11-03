export const ROWS_PER_PAGE_OPTIONS = [10, 25, 50, 100];
export const DEFAULT_PAGE = 0;
export const DEFAULT_ROWS_PER_PAGE = 10;
export const SELECT_HEIGHT = 32;
export const SELECT_MIN_WIDTH = 120;
export const ROWS_PER_PAGE_OPTIONS_TRANSACTIONS = [10, 20, 30];

//export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export const API_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? "" : "http://localhost:5000");

export const STATUS = {
  ALL: "all",
  ACTIVE: "active",
  INACTIVE: "inactive",
} as const;
export type StatusType = (typeof STATUS)[keyof typeof STATUS];

export const SORT_ORDER = {
  CROISSANT: "az",
  DECROISSANT: "za",
} as const;
export type SortOrderType = (typeof SORT_ORDER)[keyof typeof SORT_ORDER];

export const AVAILABILITY = {
  ALL: "all",
  AVAILABLE: "disponible",
  UNAVILABLE: "indisponible",
} as const;
export type AvailabilityType = (typeof AVAILABILITY)[keyof typeof AVAILABILITY];
