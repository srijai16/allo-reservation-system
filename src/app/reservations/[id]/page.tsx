"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, XCircle, MapPin, Boxes, Minus, Plus } from "lucide-react"
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import {
  ApiError,
  Reservation,
  cancelReservation,
  confirmReservation,
  getReservation,
} from "@/lib/reservations-api";



function StatusBadge({ status }: { status: Reservation["status"] }) {
  const map: Record<string, { label: string; cls: string }> = {
    PENDING:   { label: "Pending",   cls: "bg-neutral-900 text-white" },
    CONFIRMED: { label: "Confirmed", cls: "bg-emerald-100 text-emerald-700 border border-emerald-500" },
    RELEASED:  { label: "Released",  cls: "bg-red-100 text-red-700 border border-red-400" },
    cancelled: { label: "Cancelled", cls: "bg-red-100 text-red-700 border border-red-400" },
    expired:   { label: "Expired",   cls: "bg-red-100 text-red-700 border border-red-400" },
  };
  const v = map[status] ?? { label: String(status), cls: "bg-gray-100 text-gray-600 border" };
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-semibold tracking-widest uppercase ${v.cls}`}>
      {v.label}
    </span>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-[10px] font-semibold tracking-widest uppercase text-neutral-400">
        {label}
      </dt>
      <dd className="text-[14px] font-medium text-neutral-800">{value}</dd>
    </div>
  );
}


export default function ReservationPage() {
  const params   = useParams<{ id: string }>();
  const router   = useRouter();
  const id       = params.id;

  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<{ status: number; message: string } | null>(null);
  const [working,     setWorking]     = useState<"confirm" | "cancel" | null>(null);
  const [now,         setNow]         = useState(() => Date.now());

  //const warehouseName = useWarehouseName(reservation?.warehouseId ?? "");

  // ── Fetching ──

  async function refresh() {
    try {
      const r = await getReservation(id);
      setReservation(r);
      setError(null);
    } catch (e) {
      setError({
        status: e instanceof ApiError ? e.status : 0,
        message: e instanceof Error ? e.message : "Unknown error",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (id) refresh(); }, [id]); // eslint-disable-line

  // ── Countdown ──

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);

  const msLeft = useMemo(() => {
    if (!reservation) return 0;
    return Math.max(0, new Date(reservation.expiresAt).getTime() - now);
  }, [reservation, now]);

  useEffect(() => {
    if (reservation?.status === "PENDING" && msLeft === 0) refresh();
  }, [msLeft]); // eslint-disable-line

  const seconds = Math.ceil(msLeft / 1000);
  const pct     = reservation ? Math.max(0, Math.min(100, (msLeft / 60_000) * 100)) : 0;
  const isDanger = seconds <= 10;

  // ── Actions ──

  async function onConfirm() {
    if (!reservation) return;
    setWorking("confirm");
    try {
      const r = await confirmReservation(reservation.id);
      setReservation(r);
      toast.custom(() => (
        <div className="flex items-start gap-3.5 w-[360px] rounded-2xl border border-emerald-200 bg-white px-5 py-4 shadow-lg shadow-emerald-100/60">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 mt-0.5">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          </div>
          <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-zinc-900 leading-snug">
            Purchase confirmed
          </p>

          <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">
            <span className="font-medium text-zinc-700">
              {reservation.quantity}× {reservation.name}
            </span>{" "}
            confirmed from{" "}
            <span className="font-medium text-emerald-600">
              {reservation.warehouseName}
            </span>
            .
          </p>
        </div>
        </div>
      ))
      await refresh()
      
      //toast.success("Purchase confirmed");
    } catch (e) {
      if (e instanceof ApiError) {
        setError({ status: e.status, message: e.message })

        const label =
          e.status === 410
            ? "Reservation expired"
            : e.status === 409
            ? "Conflict"
            : `Error ${e.status}`

        const color =
          e.status === 410
            ? "orange"
            : e.status === 409
            ? "amber"
            : "red"

        toast.custom(() => (
          <div
            className={`flex w-[360px] items-start gap-3.5 rounded-2xl border bg-white px-5 py-4 shadow-lg ${
              color === "orange"
                ? "border-orange-200 shadow-orange-100/50"
                : color === "amber"
                ? "border-amber-200 shadow-amber-100/50"
                : "border-red-200 shadow-red-100/50"
            }`}
          >
            <div
              className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                color === "orange"
                  ? "bg-orange-50"
                  : color === "amber"
                  ? "bg-amber-50"
                  : "bg-red-50"
              }`}
            >
              <span
                className={`font-mono text-xs font-bold ${
                  color === "orange"
                    ? "text-orange-600"
                    : color === "amber"
                    ? "text-amber-600"
                    : "text-red-600"
                }`}
              >
                {e.status}
              </span>
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-snug text-zinc-900">
                {label}
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-zinc-500">
                {e.message}
              </p>
            </div>
          </div>
        ))
        await refresh()
      } else {
        toast.custom(() => (
          <div className="flex w-[360px] items-start gap-3.5 rounded-2xl border border-red-200 bg-white px-5 py-4 shadow-lg shadow-red-100/50">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-50">
              <span className="font-mono text-xs font-bold text-red-600">!</span>
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-snug text-zinc-900">
                Confirm failed
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-zinc-500">
                Something went wrong. Please try again.
              </p>
            </div>
          </div>
        ))
        await refresh()
      }
    }finally {
      
      setWorking(null);
    }
  }

  async function onCancel() {
    if (!reservation) return;
    setWorking("cancel");
    try {
      const r = await cancelReservation(reservation.id);
      setReservation(r);
      toast.custom(() => (
          <div className="flex items-start gap-3.5 w-[360px] rounded-2xl border border-red-200 bg-white px-5 py-4 shadow-lg shadow-red-100/50">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-50 mt-0.5">
              <XCircle className="h-5 w-5 text-red-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-zinc-900 leading-snug">
                Reservation cancelled
              </p>
            
            </div>
          </div>
        ))
      //toast.success("Reservation cancelled");
    } catch (e) {
      toast.error("Cancel failed", { description: e instanceof Error ? e.message : "Unknown" });
    } finally {
      await refresh()
      setWorking(null);
    }
  }

  // ── Render ──

  return (
    <div className="min-h-screen bg-[#F5F3EF] font-sans">
      <Toaster richColors position="top-right" />

      {/* Header */}
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto max-w-xl px-6 py-5 flex items-center gap-4">
          <button
            onClick={() => router.push("/")}
            className="text-sm text-neutral-400 hover:text-neutral-800 flex items-center gap-1.5 transition-colors"
          >
            ← Back to products
          </button>
          <span className="text-neutral-200">|</span>
          <h1 className="text-xl font-serif font-semibold tracking-tight text-neutral-900">
            Checkout
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-6 py-10">
        {loading ? (
          <p className="text-sm text-neutral-400">Loading reservation…</p>
        ) : error && !reservation ? (
          <Alert variant="destructive">
            <AlertTitle>Error {error.status || ""}</AlertTitle>
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        ) : reservation ? (
          <div className="rounded-2xl bg-white border border-neutral-200 shadow-sm overflow-hidden">

            {/* Card header */}
            <div className="px-7 py-6 border-b border-neutral-100 flex items-start justify-between gap-3">
              <h2 className="text-xl font-semibold text-neutral-900 leading-tight">
                {reservation.name}
              </h2>
              <StatusBadge status={reservation.status} />
            </div>

            {/* Info grid */}
            <div className="px-7 py-6 grid grid-cols-2 gap-5">
              <InfoRow
                label="Reservation ID"
                value={
                  <code className="font-mono text-xs text-neutral-500 bg-neutral-50 px-1.5 py-0.5 rounded">
                    {reservation.id}
                  </code>
                }
              />
              <InfoRow label="Quantity"   value={`${reservation.quantity} unit${reservation.quantity !== 1 ? "s" : ""}`} />
              <InfoRow label="Warehouse"  value={reservation.warehouseName} />
              <InfoRow
                label="Status"
                value={
                  reservation.status === "PENDING"   ? "Awaiting confirmation"
                  : reservation.status === "CONFIRMED" ? "Confirmed"
                  : "Released / Expired"
                }
              />
              {reservation.releasedAt && (
                <InfoRow
                  label="Released At"
                  value={new Date(reservation.releasedAt).toLocaleString()}
                />
              )}
            </div>

            {/* Timer bar */}
            {reservation.status === "PENDING" && (
              <div className="mx-7 mb-4 rounded-xl bg-neutral-50 border border-neutral-100 px-5 py-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-semibold tracking-widest uppercase text-neutral-400">
                    Time remaining
                  </span>
                  <span
                    className={`font-mono text-xl font-bold tabular-nums transition-colors ${
                      isDanger ? "text-red-600" : "text-neutral-900"
                    }`}
                  >
                    {seconds}s
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-neutral-200 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-200 ${
                      isDanger ? "bg-red-500" : "bg-neutral-900"
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )}

            {/* Confirmed success banner */}
            {reservation.status === "CONFIRMED" && (
              <div className="mx-7 mb-5 flex items-center gap-3 rounded-xl bg-emerald-50 border border-emerald-200 px-5 py-4 text-emerald-700 font-semibold text-sm">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="9" cy="9" r="7.5"/>
                  <path d="M5.5 9l2.5 2.5 4.5-4.5"/>
                </svg>
                Purchase confirmed successfully
              </div>
            )}

            {/* API Error */}
            {error && (
              <div className="mx-7 mb-4">
                <Alert variant="destructive">
                  <AlertTitle>
                    {error.status === 410 ? "Reservation expired"
                      : error.status === 409 ? "Conflict"
                      : `Error ${error.status}`}
                  </AlertTitle>
                  <AlertDescription>{error.message}</AlertDescription>
                </Alert>
              </div>
            )}

            {/* Action buttons */}
            {reservation.status === "PENDING" && (
              <div className="px-7 py-5 border-t border-neutral-100 flex gap-3">
                {/* Confirm — black */}
                <button
                  onClick={onConfirm}
                  disabled={working !== null}
                  className="flex-1 h-12 rounded-xl bg-neutral-900 text-white text-sm font-semibold
                             flex items-center justify-center gap-2 transition-all
                             hover:bg-neutral-700 active:scale-[0.98]
                             disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100
                             shadow-sm hover:shadow-md"
                >
                  {working === "confirm" ? (
                    <>
                      <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      Confirming…
                    </>
                  ) : "Confirm Purchase"}
                </button>

                {/* Cancel — red */}
                <button
                  onClick={onCancel}
                  disabled={working !== null}
                  className="flex-1 h-12 rounded-xl bg-red-600 text-white text-sm font-semibold
                             flex items-center justify-center gap-2 transition-all
                             hover:bg-red-700 active:scale-[0.98]
                             disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100
                             shadow-sm hover:shadow-md"
                >
                  {working === "cancel" ? (
                    <>
                      <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      Cancelling…
                    </>
                  ) : "Cancel"}
                </button>
              </div>
            )}
          </div>
        ) : null}
      </main>
    </div>
  );
}
