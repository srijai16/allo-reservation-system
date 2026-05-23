"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";

import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

import {
  ApiError,
  Reservation,
  cancelReservation,
  confirmReservation,
  getReservation,
} from "@/lib/reservations-api";

export default function ReservationPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ status: number; message: string } | null>(
    null
  );
  const [working, setWorking] = useState<"confirm" | "cancel" | null>(null);
  const [now, setNow] = useState(() => Date.now());

  async function refresh() {
    try {
      const r = await getReservation(id);
      setReservation(r);
      setError(null);
    } catch (e) {
      if (e instanceof ApiError) {
        setError({ status: e.status, message: e.message });
      } else {
        setError({
          status: 0,
          message: e instanceof Error ? e.message : "Unknown",
        });
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (id) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, []);

  const msLeft = useMemo(() => {
    if (!reservation) return 0;
    return Math.max(0, new Date(reservation.expiresAt).getTime() - now);
  }, [reservation, now]);

  useEffect(() => {
    if (reservation?.status === "PENDING" && msLeft === 0) {
      refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [msLeft]);

  async function onConfirm() {
    if (!reservation) return;

    setWorking("confirm");

    try {
      const r = await confirmReservation(reservation.id);
      setReservation(r);
      toast.success("Purchase confirmed");
    } catch (e) {
      if (e instanceof ApiError) {
        setError({ status: e.status, message: e.message });

        if (e.status === 410) {
          toast.error("Reservation expired (410)", {
            description: e.message,
          });
        } else if (e.status === 409) {
          toast.error("Conflict (409)", {
            description: e.message,
          });
        } else {
          toast.error(`Error ${e.status}`, {
            description: e.message,
          });
        }

        refresh();
      } else {
        toast.error("Confirm failed");
      }
    } finally {
      setWorking(null);
    }
  }

  async function onCancel() {
    if (!reservation) return;

    setWorking("cancel");

    try {
      const r = await cancelReservation(reservation.id);
      setReservation(r);
      toast.success("Reservation cancelled");
    } catch (e) {
      toast.error("Cancel failed", {
        description: e instanceof Error ? e.message : "Unknown",
      });
    } finally {
      setWorking(null);
    }
  }

  const seconds = Math.ceil(msLeft / 1000);

  const pct = reservation
    ? Math.max(0, Math.min(100, (msLeft / 60_000) * 100))
    : 0;

  return (
    <div className="min-h-screen bg-background">
      <Toaster richColors position="top-right" />

      <header className="border-b">
        <div className="mx-auto max-w-3xl px-6 py-6">
          <button
            onClick={() => router.push("/")}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Back to products
          </button>

          <h1 className="mt-2 text-2xl font-semibold tracking-tight">
            Checkout
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8">
        {loading ? (
          <p className="text-sm text-muted-foreground">
            Loading reservation…
          </p>
        ) : error && !reservation ? (
          <Alert variant="destructive">
            <AlertTitle>Error {error.status || ""}</AlertTitle>
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        ) : reservation ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2">
                <span>{reservation.name}</span>
                <StatusBadge status={reservation.status} />
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-5">
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <Row label="Reservation ID" value={<code className="text-xs">{reservation.id}</code>} />
                <Row label="Product ID" value={reservation.productId} />
                <Row label="Warehouse ID" value={reservation.warehouseId} />
                <Row label="Quantity" value={reservation.quantity} />
                <Row label="Status" value={reservation.status} />
                <Row
                label="Released At"
                value={
                    reservation.releasedAt
                    ? new Date(reservation.releasedAt).toLocaleString()
                    : "-"
                }
                />
              </dl>

              {reservation.status === "PENDING" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Expires in</span>
                    <span
                      className={`font-mono tabular-nums ${
                        seconds <= 10 ? "text-destructive" : ""
                      }`}
                    >
                      {seconds}s
                    </span>
                  </div>

                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full transition-all ${
                        seconds <= 10 ? "bg-destructive" : "bg-primary"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )}

              {error && (
                <Alert variant="destructive">
                  <AlertTitle>
                    {error.status === 410
                      ? "Reservation expired (410)"
                      : error.status === 409
                      ? "Conflict (409)"
                      : `Error ${error.status}`}
                  </AlertTitle>
                  <AlertDescription>{error.message}</AlertDescription>
                </Alert>
              )}
            </CardContent>

            <CardFooter className="flex gap-2">
              <Button
                className="flex-1"
                onClick={onConfirm}
                disabled={reservation.status !== "PENDING" || working !== null}
              >
                {working === "confirm" ? "Confirming…" : "Confirm purchase"}
              </Button>

              <Button
                className="flex-1"
                variant="outline"
                onClick={onCancel}
                disabled={reservation.status !== "PENDING" || working !== null}
              >
                {working === "cancel" ? "Cancelling…" : "Cancel"}
              </Button>
            </CardFooter>
          </Card>
        ) : null}
      </main>
    </div>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5">{value}</dd>
    </div>
  );
}

function StatusBadge({ status }: { status: Reservation["status"] }) {
  const map: Record<
    string,
    {
      label: string;
      variant: "default" | "secondary" | "destructive" | "outline";
    }
  > = {
    PENDING: { label: "Pending", variant: "default" },
    CONFIRMED: { label: "Confirmed", variant: "secondary" },
    RELEASED: { label: "Released", variant: "destructive" },

    
    active: { label: "Active", variant: "default" },
    confirmed: { label: "Confirmed", variant: "secondary" },
    cancelled: { label: "Cancelled", variant: "outline" },
    expired: { label: "Expired", variant: "destructive" },
  };

  const v = map[status] ?? {
    label: String(status),
    variant: "outline" as const,
  };

  return <Badge variant={v.variant}>{v.label}</Badge>;
}