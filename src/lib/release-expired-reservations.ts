import { prisma } from "@/lib/prisma"
import { redis } from "@/lib/redis"

export async function releaseExpiredReservations() {
  const now = new Date()
  let releasedCount = 0

  const expiredReservations = await prisma.reservation.findMany({
    where: {
      status: "PENDING",
      expiresAt: {
        lt: now,
      },
    },
  })

  for (const reservation of expiredReservations) {
    await prisma.$transaction(async (tx) => {
      const latest = await tx.reservation.findUnique({
        where: { id: reservation.id },
      })

      if (!latest || latest.status !== "PENDING" || latest.expiresAt >= now) {
        return
      }

      await tx.stockLevel.update({
        where: {
          productId_warehouseId: {
            productId: latest.productId,
            warehouseId: latest.warehouseId,
          },
        },
        data: {
          reservedUnits: {
            decrement: latest.quantity,
          },
        },
      })

      await tx.reservation.update({
        where: { id: latest.id },
        data: {
          status: "RELEASED",
          releasedAt: now,
        },
      })

      releasedCount++
    })
  }

  if (releasedCount > 0) {
    await redis.del("products:list")
  }

  return releasedCount
}