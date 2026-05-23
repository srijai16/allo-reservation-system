export type WarehouseStock = {
  warehouseId: string;
  warehouseName: string;
  location: string;
  totalUnits: number;
  reservedUnits: number;
  availableUnits: number;
};

export type Product = {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  price: number | null;
  warehouses: WarehouseStock[];
};

export type Reservation = {
  id: string;
  productId: string;
  name:string;
  warehouseId: string;
  quantity: number;
  status: "PENDING" | "CONFIRMED" | "RELEASED";
  expiresAt: string;
  confirmedAt: string | null;
  releasedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(data?.error ?? "Something went wrong", res.status);
  }

  return data as T;
}

export async function listProducts(): Promise<Product[]> {
  return request<Product[]>("/api/products");
}

export async function createReservation(input: {
  productId: string;
  warehouseId: string;
  quantity: number;
}): Promise<Reservation> {
  return request<Reservation>("/api/reservations", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function getReservation(id: string): Promise<Reservation> {
  return request<Reservation>(`/api/reservations/${id}`);
}

export async function confirmReservation(id: string): Promise<Reservation> {
  return request<Reservation>(`/api/reservations/${id}/confirm`, {
    method: "POST",
  });
}

export async function releaseReservation(id: string): Promise<Reservation> {
  return request<Reservation>(`/api/reservations/${id}/release`, {
    method: "POST",
  });
}

export async function cancelReservation(id: string): Promise<Reservation> {
  return releaseReservation(id);
}

export function subscribe(callback: () => void) {
  const interval = window.setInterval(callback, 3000);

  return () => {
    window.clearInterval(interval);
  };
}