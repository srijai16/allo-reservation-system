// src/app/api/reservations/route.ts (post)
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { z } from "zod";

const reserveSchema = z.object({
  productId: z.string(),
  warehouseId: z.string(),
  quantity: z.number().int().min(1),
});

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = reserveSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const { productId, warehouseId, quantity } = parsed.data;
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

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
        `;

        if (updatedRows.length !== 1) {
          throw new Error("NOT_ENOUGH_STOCK");
        }

        return tx.reservation.create({
          data: {
            productId,
            warehouseId,
            quantity,
            status: "PENDING",
            expiresAt,
          },
        });
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      }
    );

    return NextResponse.json(reservation, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_ENOUGH_STOCK") {
      return NextResponse.json(
        { error: "Not enough stock available" },
        { status: 409 }
      );
    }

    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}