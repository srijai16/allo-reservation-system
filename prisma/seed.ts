import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
})

const prisma = new PrismaClient({ adapter })

async function main() {
  console.log("Start seeding reservation system...")

  await prisma.reservation.deleteMany()
  await prisma.stockLevel.deleteMany()
  await prisma.product.deleteMany()
  await prisma.warehouse.deleteMany()

  const warehouseA = await prisma.warehouse.create({
    data: {
      name: "Hyderabad Warehouse",
      location: "Hyderabad",
    },
  })

  const warehouseB = await prisma.warehouse.create({
    data: {
      name: "Bangalore Warehouse",
      location: "Bangalore",
    },
  })

  const warehouseC = await prisma.warehouse.create({
    data: {
      name: "Chennai Warehouse",
      location: "Chennai",
    },
  })

  const products = await Promise.all([
    prisma.product.create({
      data: {
        name: "Classic T-Shirt",
        description: "Comfortable cotton t-shirt for daily wear",
        imageUrl: "https://placehold.co/400x300?text=T-Shirt",
        price: 499,
      },
    }),
    prisma.product.create({
      data: {
        name: "Casual Shirt",
        description: "Stylish casual shirt for office and outings",
        imageUrl: "https://placehold.co/400x300?text=Shirt",
        price: 899,
      },
    }),
    prisma.product.create({
      data: {
        name: "Running Shoes",
        description: "Lightweight running shoes with soft cushioning",
        imageUrl: "https://placehold.co/400x300?text=Shoes",
        price: 2499,
      },
    }),
    prisma.product.create({
      data: {
        name: "Smart Watch",
        description: "Fitness tracking smart watch with long battery life",
        imageUrl: "https://placehold.co/400x300?text=Watch",
        price: 1999,
      },
    }),
    prisma.product.create({
      data: {
        name: "Travel Bag",
        description: "Durable travel bag with spacious compartments",
        imageUrl: "https://placehold.co/400x300?text=Bag",
        price: 1299,
      },
    }),
    prisma.product.create({
      data: {
        name: "Table Light",
        description: "Adjustable LED table light for study and work",
        imageUrl: "https://placehold.co/400x300?text=Table+Light",
        price: 699,
      },
    }),
    prisma.product.create({
      data: {
        name: "Bluetooth Speaker",
        description: "Portable speaker with clear sound and deep bass",
        imageUrl: "https://placehold.co/400x300?text=Speaker",
        price: 1599,
      },
    }),
  ])

  const [tshirt, shirt, shoes, watch, bag, tableLight, speaker] = products

  await prisma.stockLevel.createMany({
    data: [
      // T-Shirt
      {
        productId: tshirt.id,
        warehouseId: warehouseA.id,
        totalUnits: 20,
        reservedUnits: 0,
      },
      {
        productId: tshirt.id,
        warehouseId: warehouseB.id,
        totalUnits: 12,
        reservedUnits: 0,
      },

      // Shirt
      {
        productId: shirt.id,
        warehouseId: warehouseA.id,
        totalUnits: 15,
        reservedUnits: 0,
      },
      {
        productId: shirt.id,
        warehouseId: warehouseC.id,
        totalUnits: 8,
        reservedUnits: 0,
      },

      // Shoes
      {
        productId: shoes.id,
        warehouseId: warehouseA.id,
        totalUnits: 10,
        reservedUnits: 0,
      },
      {
        productId: shoes.id,
        warehouseId: warehouseB.id,
        totalUnits: 6,
        reservedUnits: 0,
      },

      // Watch
      {
        productId: watch.id,
        warehouseId: warehouseB.id,
        totalUnits: 9,
        reservedUnits: 0,
      },
      {
        productId: watch.id,
        warehouseId: warehouseC.id,
        totalUnits: 4,
        reservedUnits: 0,
      },

      // Bag
      {
        productId: bag.id,
        warehouseId: warehouseA.id,
        totalUnits: 7,
        reservedUnits: 0,
      },
      {
        productId: bag.id,
        warehouseId: warehouseC.id,
        totalUnits: 11,
        reservedUnits: 0,
      },

      // Table Light
      {
        productId: tableLight.id,
        warehouseId: warehouseB.id,
        totalUnits: 14,
        reservedUnits: 0,
      },
      {
        productId: tableLight.id,
        warehouseId: warehouseC.id,
        totalUnits: 5,
        reservedUnits: 0,
      },

      // Speaker
      {
        productId: speaker.id,
        warehouseId: warehouseA.id,
        totalUnits: 6,
        reservedUnits: 0,
      },
      {
        productId: speaker.id,
        warehouseId: warehouseB.id,
        totalUnits: 10,
        reservedUnits: 0,
      },
    ],
  })

  console.log("Database seeded successfully")
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })