// src/app/api/reservations/route.ts
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { redis } from "@/lib/redis"
import { Prisma } from "@prisma/client"
import { z } from "zod"

import {
  getCachedIdempotentResponse,
  getIdempotencyKey,
  hashBody,
  saveIdempotentResponse,
} from "@/lib/idempotency"

const reserveSchema = z.object({
  productId: z.string(),
  warehouseId: z.string(),
  warehouseName: z.string(),
  name: z.string(),
  quantity: z.number().int().min(1),
})

export async function POST(req: Request) {
  const body = await req.json()
  const parsed = reserveSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    )
  }

  const endpoint = "POST /api/reservations"
  const idempotencyKey = getIdempotencyKey(req)
  const requestHash = hashBody(parsed.data)

  if (idempotencyKey) {
    const cached = await getCachedIdempotentResponse(
      idempotencyKey,
      endpoint,
      requestHash
    )

    if (cached) return cached
  }

  const { productId, warehouseId, warehouseName, name, quantity } = parsed.data
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

  try {
    const reservation = await prisma.$transaction(
      async (tx) => {
        const updatedRows = await tx.$queryRaw<{ id: string }[]>`
          UPDATE "StockLevel"
          SET "reservedUnits" = "reservedUnits" + ${quantity}
          WHERE "productId" = ${productId}
            AND "warehouseId" = ${warehouseId}
            AND ("totalUnits" - "reservedUnits") >= ${quantity}
          RETURNING id
        `

        if (updatedRows.length !== 1) {
          throw new Error("NOT_ENOUGH_STOCK")
        }

        return tx.reservation.create({
          data: {
            productId,
            warehouseId,
            warehouseName,
            name,
            quantity,
            status: "PENDING",
            expiresAt,
          },
        })
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      }
    )

    await redis.del("products:list")

    if (idempotencyKey) {
      await saveIdempotentResponse({
        key: idempotencyKey,
        endpoint,
        requestHash,
        statusCode: 201,
        responseBody: reservation,
      })
    }

    return NextResponse.json(reservation, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_ENOUGH_STOCK") {
      return NextResponse.json(
        { error: "Not enough stock available" },
        { status: 409 }
      )
    }

    console.error(error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}