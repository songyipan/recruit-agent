import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

const globalForPrisma = global as unknown as {
  prisma: PrismaClient
}

// 使用 connectionString 创建 adapter
// 参考: https://www.prisma.io/docs/orm/overview/databases/postgresql
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
})

const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter,
  })

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma

export default prisma
