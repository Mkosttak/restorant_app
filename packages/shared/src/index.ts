// Roller
export enum UserRole {
  ADMIN = 'ADMIN',
  EMPLOYEE = 'EMPLOYEE',
}

// Masa Durumlari
export enum TableStatus {
  AVAILABLE = 'AVAILABLE',
  OCCUPIED = 'OCCUPIED',
  RESERVED = 'RESERVED',
}

// Siparis Durumlari
export enum OrderStatus {
  PENDING = 'PENDING',
  PREPARING = 'PREPARING',
  READY = 'READY',
  SERVED = 'SERVED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

// Odeme Yontemleri
export enum PaymentMethod {
  CASH = 'CASH',
  CREDIT_CARD = 'CREDIT_CARD',
  DEBIT_CARD = 'DEBIT_CARD',
}

// Siparis Tipleri
export enum OrderType {
  DINE_IN = 'DINE_IN',
  TAKEAWAY = 'TAKEAWAY',
  PLATFORM = 'PLATFORM',
}

// Rezervasyon Durumlari
export enum ReservationStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  SEATED = 'SEATED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
}

// --- API Response Tipleri ---

export interface ApiUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApiCategory {
  id: string;
  nameTr: string;
  nameEn: string;
  sortOrder: number;
  isActive: boolean;
  _count?: { menuItems: number };
}

export interface ApiMenuItemOption {
  id: string;
  menuItemId: string;
  nameTr: string;
  nameEn: string;
  extraPriceCents: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApiMenuItem {
  id: string;
  categoryId: string;
  nameTr: string;
  nameEn: string;
  descriptionTr?: string;
  descriptionEn?: string;
  priceCents: number;
  imageUrl?: string;
  isAvailable: boolean;
  stockTracking: boolean;
  stockCount?: number;
  stockThreshold: number;
  campaignPriceCents?: number;
  campaignEndsAt?: string;
  sortOrder: number;
  isGlutenFree: boolean;
  category: ApiCategory;
  options?: ApiMenuItemOption[];
}

export interface ApiTable {
  id: string;
  number: number;
  label?: string;
  capacity: number;
  status: TableStatus;
  positionX?: number;
  positionY?: number;
  isActive: boolean;
}

export interface ApiOrderItem {
  id: string;
  menuItem: ApiMenuItem;
  quantity: number;
  unitPriceCents: number;
  note?: string;
  isComplimentary: boolean;
  options?: unknown;
}

export interface ApiOrder {
  id: string;
  status: OrderStatus;
  orderType: OrderType;
  note?: string;
  totalCents: number;
  discountCents: number;
  createdAt: string;
  updatedAt: string;
  table?: ApiTable;
  user: { id: string; name: string; email?: string };
  items: ApiOrderItem[];
  payments?: ApiPayment[];
}

export interface ApiPayment {
  id: string;
  orderId: string;
  amountCents: number;
  method: PaymentMethod;
  note?: string;
  createdAt: string;
  user?: { id: string; name: string };
}

export interface ApiReservation {
  id: string;
  tableId: string;
  customerName: string;
  customerPhone?: string;
  guestCount: number;
  reservedAt: string;
  note?: string;
  status: ReservationStatus;
  table?: ApiTable;
}

export interface ApiBusinessHours {
  id: string;
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
