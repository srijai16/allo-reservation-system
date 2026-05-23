// src/app/api/reservations/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const reserveSchema = z.object({
  productId: z.string(),
  warehouseId: z.string(),
  quantity: z.number().min(1),
  expiresInMinutes: z.number().min(1).max(60).optional(),
});

export async function POST(req: Request) {
  const body = await req.json();
  const parse = reserveSchema.safeParse(body);
  if (!parse.success) return NextResponse.json({ error: parse.error }, { status: 400 });

  const { productId, warehouseId, quantity, expiresInMinutes = 10 } = parse.data;
  const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

  try {
    return await prisma.$transaction(async (tx) => {
      // Lock the stock row
      const stock = await tx.stockLevel.findUnique({
        where: { productId_warehouseId: { productId, warehouseId } },
      });

      if (!stock || stock.totalUnits - stock.reservedUnits < quantity) {
        return NextResponse.json({ error: "Not enough stock" }, { status: 409 });
      }

      // Increment reservedUnits
      await tx.stockLevel.update({
        where: { productId_warehouseId: { productId, warehouseId } },
        data: { reservedUnits: { increment: quantity } },
      });

      // Create reservation
      const reservation = await tx.reservation.create({
        data: {
          productId,
          warehouseId,
          quantity,
          status: "PENDING",
          expiresAt,
        },
      });

      return NextResponse.json(reservation);
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}