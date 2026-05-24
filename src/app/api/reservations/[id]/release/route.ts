// src/app/api/reservations/[id]/release/route.ts
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { redis } from "@/lib/redis"

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const now = new Date()

  try {
    const reservation = await prisma.reservation.findUnique({
      where: { id },
    })

    if (!reservation || reservation.status !== "PENDING") {
      return NextResponse.json(
        { error: "Reservation not found or cannot release" },
        { status: 410 }
      )
    }

    const released = await prisma.$transaction(async (tx) => {
      await tx.stockLevel.update({
        where: {
          productId_warehouseId: {
            productId: reservation.productId,
            warehouseId: reservation.warehouseId,
          },
        },
        data: {
          reservedUnits: {
            decrement: reservation.quantity,
          },
        },
      })

      return tx.reservation.update({
        where: { id },
        data: {
          status: "RELEASED",
          releasedAt: now,
        },
      })
    })

    await redis.del("products:list")

    return NextResponse.json(released)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}