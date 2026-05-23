import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });
async function main() {
  console.log('Start seeding reservation system...')
  await prisma.reservation.deleteMany();
  await prisma.stockLevel.deleteMany();
  await prisma.product.deleteMany();
  await prisma.warehouse.deleteMany();

  const warehouseA = await prisma.warehouse.create({
    data: {
      name: "Hyderabad Warehouse",
      location: "Hyderabad",
    },
  });

  const warehouseB = await prisma.warehouse.create({
    data: {
      name: "Bangalore Warehouse",
      location: "Bangalore",
    },
  });

  const tshirt = await prisma.product.create({
    data: {
      name: "Classic T-Shirt",
      description: "Comfortable cotton t-shirt",
      imageUrl: "https://placehold.co/400x300",
    },
  });

  const shoes = await prisma.product.create({
    data: {
      name: "Running Shoes",
      description: "Lightweight running shoes",
      imageUrl: "https://placehold.co/400x300",
    },
  });

  await prisma.stockLevel.createMany({
    data: [
      {
        productId: tshirt.id,
        warehouseId: warehouseA.id,
        totalUnits: 10,
        reservedUnits: 0,
      },
      {
        productId: tshirt.id,
        warehouseId: warehouseB.id,
        totalUnits: 5,
        reservedUnits: 0,
      },
      {
        productId: shoes.id,
        warehouseId: warehouseA.id,
        totalUnits: 3,
        reservedUnits: 0,
      },
      {
        productId: shoes.id,
        warehouseId: warehouseB.id,
        totalUnits: 2,
        reservedUnits: 0,
      },
    ],
  });

  console.log("Database seeded successfully");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });