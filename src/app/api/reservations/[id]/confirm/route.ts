// src/app/api/reservations/[id]/confirm/route.ts
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
        { error: "Reservation expired or invalid" },
        { status: 410 }
      )
    }

    if (reservation.expiresAt < now) {
      await prisma.$transaction(async (tx) => {
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

        await tx.reservation.update({
          where: { id },
          data: {
            status: "RELEASED",
            releasedAt: now,
          },
        })
      })

      await redis.del("products:list")

      return NextResponse.json(
        { error: "Reservation expired" },
        { status: 410 }
      )
    }

    const confirmed = await prisma.reservation.update({
      where: { id },
      data: {
        status: "CONFIRMED",
        confirmedAt: now,
      },
    })

    await redis.del("products:list")

    return NextResponse.json(confirmed)
  } catch (err) {
    console.error("Confirm reservation error:", err)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}