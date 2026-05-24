// src/app/api/products/route.ts
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { redis } from "@/lib/redis"
import { releaseExpiredReservations } from "@/lib/release-expired-reservations"

export async function GET() {
  await releaseExpiredReservations()

  const cacheKey = "products:list"

  const cached = await redis.get(cacheKey)

  if (cached) {
    return NextResponse.json(cached)
  }

  const products = await prisma.product.findMany({
    include: {
      stocks: {
        include: {
          warehouse: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  })

  const data = products.map((product) => ({
    id: product.id,
    name: product.name,
    price: product.price,
    description: product.description,
    imageUrl: product.imageUrl,
    warehouses: product.stocks.map((stock) => ({
      warehouseId: stock.warehouseId,
      warehouseName: stock.warehouse.name,
      location: stock.warehouse.location,
      totalUnits: stock.totalUnits,
      reservedUnits: stock.reservedUnits,
      availableUnits: stock.totalUnits - stock.reservedUnits,
    })),
  }))

  await redis.set(cacheKey, data, {
    ex: 10,
  })

  return NextResponse.json(data)
}