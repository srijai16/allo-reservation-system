"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { CheckCircle2, XCircle, MapPin, Boxes, Minus, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import {
  ApiError,
  createReservation,
  listProducts,
  subscribe,
  type Product,
} from "@/lib/reservations-api"

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  async function refresh() {
    const p = await listProducts()
    setProducts(p)
    setLoading(false)
  }

  useEffect(() => {
    refresh()
    const unsub = subscribe(refresh)
    return () => unsub()
  }, [])

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-zinc-900">
              Warehouse Store
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              Live stock per warehouse · Reservations hold for 10 minutes
            </p>
          </div>
          <span className="font-mono text-[11px] font-medium tracking-widest text-zinc-300 uppercase">
            STOCKR
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        {loading ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden animate-pulse"
              >
                <div className="aspect-[4/3] bg-zinc-100" />
                <div className="p-5 space-y-3">
                  <div className="h-4 bg-zinc-100 rounded w-2/3" />
                  <div className="h-3 bg-zinc-100 rounded w-full" />
                  <div className="h-3 bg-zinc-100 rounded w-4/5" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

function ProductCard({ product }: { product: Product }) {
  const router = useRouter()

  const firstAvailable =
    product.warehouses.find((w) => w.availableUnits > 0)?.warehouseId ??
    product.warehouses[0]?.warehouseId

  const [warehouseId, setWarehouseId] = useState(firstAvailable)
  const [quantity, setQuantity] = useState(1)
  const [submitting, setSubmitting] = useState(false)

  const selected = product.warehouses.find((w) => w.warehouseId === warehouseId)
  const canReserve = !!selected && selected.availableUnits > 0
  const maxQty = selected?.availableUnits ?? 1
  const totalStock = product.warehouses.reduce((s, w) => s + w.availableUnits, 0)

  // Clamp quantity when warehouse changes
  function handleWarehouseChange(id: string) {
    setWarehouseId(id)
    const wh = product.warehouses.find((w) => w.warehouseId === id)
    if (wh) setQuantity(Math.min(quantity, wh.availableUnits || 1))
  }

  async function onReserve() {
    if (!selected || !warehouseId) return
    setSubmitting(true)
    try {
      const res = await createReservation({
        productId: product.id,
        warehouseId,
        warehouseName: selected.warehouseName,
        name: product.name,
        quantity,
      })

      // Success toast
      toast.custom(() => (
        <div className="flex items-start gap-3.5 w-[360px] rounded-2xl border border-emerald-200 bg-white px-5 py-4 shadow-lg shadow-emerald-100/60">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 mt-0.5">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-zinc-900 leading-snug">
              Reserved successfully
            </p>
            <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">
              <span className="font-medium text-zinc-700">
                {quantity}× {product.name}
              </span>{" "}
              · Hold expires in{" "}
              <span className="font-medium text-emerald-600">10 min</span>
            </p>
          </div>
        </div>
      ))

      router.push(`/reservations/${res.id}`)
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        toast.custom(() => (
          <div className="flex items-start gap-3.5 w-[360px] rounded-2xl border border-amber-200 bg-white px-5 py-4 shadow-lg shadow-amber-100/50">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 mt-0.5">
              <span className="font-mono text-xs font-bold text-amber-600">409</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-zinc-900 leading-snug">
                Not enough stock
              </p>
              <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">
                {(e as ApiError).message ||
                  "Another reservation just took the last unit. Try a different warehouse."}
              </p>
            </div>
          </div>
        ))
      } else {
        toast.custom(() => (
          <div className="flex items-start gap-3.5 w-[360px] rounded-2xl border border-red-200 bg-white px-5 py-4 shadow-lg shadow-red-100/50">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-50 mt-0.5">
              <XCircle className="h-5 w-5 text-red-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-zinc-900 leading-snug">
                Reservation failed
              </p>
              <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">
                {e instanceof Error ? e.message : "Something went wrong. Please try again."}
              </p>
            </div>
          </div>
        ))
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (<Card className="group flex flex-col overflow-hidden rounded-2xl border-0 bg-white shadow-md">

     {/* Product image */}
<div className="relative aspect-[4/3] w-full overflow-hidden bg-zinc-50">
  <img
    src={product.imageUrl ?? "/placeholder.png"}
    alt={product.name}
    className="block h-full w-full object-cover"
    loading="lazy"
  />

  {totalStock === 0 && (
    <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-[2px]">
      <span className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-500 shadow-sm">
        Out of stock
      </span>
    </div>
  )}
</div>

      <CardHeader className="px-5 pt-4 pb-2">
        <CardTitle className="flex items-start justify-between gap-2">
          <span className="text-base font-semibold text-zinc-900 leading-snug">
            {product.name}
          </span>
          <span className="shrink-0 font-mono text-base font-semibold text-zinc-900">
            ₹{product.price ?? 0}
          </span>
        </CardTitle>
        <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2 mt-1">
          {product.description}
        </p>
      </CardHeader>

      <CardContent className="flex-1 space-y-3 px-5 pb-4">
        {/* Flat warehouse list — no box/border */}
        <div className="space-y-1.5">
          <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
            <Boxes className="h-3 w-3" />
            Stock by warehouse
          </p>
          <ul className="space-y-1.5">
            {product.warehouses.map((w) => (
              <li
                key={w.warehouseId}
                className="flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-xs font-medium text-zinc-800 truncate">
                    {w.warehouseName}
                  </p>
                  <p className="flex items-center gap-0.5 text-[10px] text-zinc-400">
                    <MapPin className="h-2.5 w-2.5" />
                    {w.location}
                  </p>
                </div>

                <Badge
                  variant="outline"
                  className={[
                    "shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold tabular-nums",
                    w.availableUnits === 0
                      ? "border-red-200 bg-red-50 text-red-500"
                      : w.availableUnits <= 5
                      ? "border-amber-200 bg-amber-50 text-amber-600"
                      : "border-emerald-200 bg-emerald-50 text-emerald-600",
                  ].join(" ")}
                >
                  {w.availableUnits > 0 ? `${w.availableUnits} avail` : "None"}
                </Badge>
              </li>
            ))}
          </ul>
        </div>

        {/* Warehouse selector */}
        <Select value={warehouseId} onValueChange={handleWarehouseChange}>
          <SelectTrigger className="h-9 w-full rounded-xl border-zinc-200 bg-white text-xs shadow-none focus:ring-1 focus:ring-zinc-300">
            <SelectValue placeholder="Select warehouse" />
          </SelectTrigger>
          <SelectContent
            position="popper"
            sideOffset={6}
            className="rounded-xl border-zinc-200 bg-white shadow-xl text-zinc-900"
          >
            {product.warehouses.map((w) => (
              <SelectItem
                key={w.warehouseId}
                value={w.warehouseId}
                disabled={w.availableUnits === 0}
                className="text-xs rounded-lg cursor-pointer focus:bg-zinc-50"
              >
                {w.warehouseName} —{" "}
                <span
                  className={
                    w.availableUnits === 0 ? "text-red-400" : "text-emerald-600"
                  }
                >
                  {w.availableUnits} available
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Quantity stepper */}
        {canReserve && (
          <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
            <span className="text-xs font-medium text-zinc-500">Quantity</span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
                className="flex h-6 w-6 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Minus className="h-3 w-3" />
              </button>
              <span className="w-5 text-center font-mono text-sm font-semibold text-zinc-900 tabular-nums">
                {quantity}
              </span>
              <button
                onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                disabled={quantity >= maxQty}
                className="flex h-6 w-6 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="border-0 bg-white px-5 pb-5 pt-0">
        <Button
          className={[
            "h-10 w-full rounded-xl text-sm font-semibold transition-all",
            canReserve
              ? "bg-zinc-900 text-white hover:bg-zinc-700 shadow-sm hover:shadow"
              : "bg-zinc-100 text-zinc-400 cursor-not-allowed",
          ].join(" ")}
          onClick={onReserve}
          disabled={!canReserve || submitting}
        >
          {submitting ? (
            <span className="flex items-center gap-2">
              <span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              Reserving…
            </span>
          ) : canReserve ? (
            `Reserve${quantity > 1 ? ` ${quantity}` : ""}`
          ) : (
            "Unavailable"
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}