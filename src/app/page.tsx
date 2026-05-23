"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

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
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto max-w-6xl px-6 py-6">
          <h1 className="text-2xl font-semibold tracking-tight">
            Warehouse Store
          </h1>
          <p className="text-sm text-muted-foreground">
            Live stock per warehouse. Reservations hold inventory for 60 seconds.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading products…</p>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
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
  const [submitting, setSubmitting] = useState(false)

  const selected = product.warehouses.find(
    (w) => w.warehouseId === warehouseId
  )

  const canReserve = !!selected && selected.availableUnits > 0

  async function onReserve() {
    if (!selected || !warehouseId) return

    setSubmitting(true)

    try {
      const res = await createReservation({
        productId: product.id,
        warehouseId,
        quantity: 1,
      })

      toast.success("Reserved", { description: "Hold expires in 60s" })
      router.push(`/reservations/${res.id}`)
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        toast.error("Not enough stock (409)", { description: e.message })
      } else {
        toast.error("Reservation failed", {
          description: e instanceof Error ? e.message : "Unknown error",
        })
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card className="overflow-visible rounded-xl border border-[#e5e7eb] bg-white shadow-sm">
      <div className="aspect-[4/3] w-full overflow-hidden bg-muted">
        <img
          src={product.imageUrl ?? "/placeholder.png"}
          alt={product.name}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      </div>

      <CardHeader>
        <CardTitle className="flex items-start justify-between gap-2">
          <span>{product.name}</span>
          <span className="text-base font-semibold">
            ${product.price ?? 0}
          </span>
        </CardTitle>
        <p className="text-sm text-muted-foreground">{product.description}</p>
      </CardHeader>

      <CardContent className="space-y-3">
        <ul className="space-y-1">
          {product.warehouses.map((w) => (
            <li
              key={w.warehouseId}
              className="flex items-center justify-between gap-2 text-sm"
            >
              <div>
                <p className="font-medium">{w.warehouseName}</p>
                <p className="text-xs text-muted-foreground">{w.location}</p>
              </div>

              <Badge variant={w.availableUnits > 0 ? "secondary" : "outline"}>
                {w.availableUnits > 0
                  ? `${w.availableUnits}/${w.totalUnits} available`
                  : "Out of stock"}
              </Badge>
            </li>
          ))}
        </ul>

        <Select value={warehouseId} onValueChange={setWarehouseId}>
        <SelectTrigger className="h-10 w-full rounded-md border bg-white text-sm shadow-sm">
          <SelectValue placeholder="Select warehouse" />
        </SelectTrigger>

        <SelectContent
          position="popper"
          sideOffset={6}
          className="z-[9999] rounded-md border bg-white text-black shadow-xl"
        >
          {product.warehouses.map((w) => (
            <SelectItem
              key={w.warehouseId}
              value={w.warehouseId}
              disabled={w.availableUnits === 0}
              className="cursor-pointer bg-white text-sm text-black focus:bg-slate-100"
            >
              {w.warehouseName} — {w.availableUnits} available
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      </CardContent>

      <CardFooter>
        <Button
          className="h-10 w-full rounded-md bg-slate-950 font-semibold text-white hover:bg-slate-800"
          onClick={onReserve}
          disabled={!canReserve || submitting}
        >
          {submitting ? "Reserving…" : canReserve ? "Reserve" : "Unavailable"}
        </Button>
      </CardFooter>
    </Card>
  )
}