import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const warehouses = await prisma.warehouse.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });

  return NextResponse.json(warehouses);
}