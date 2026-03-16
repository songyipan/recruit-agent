import "dotenv/config"
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error("DATABASE_URL is not defined")
}

const adapter = new PrismaPg({
  connectionString,
})

const prisma = new PrismaClient({ adapter })

async function main() {
  // 创建两个用户
  const user1 = await prisma.user.create({
    data: {
      email: "alice@example.com",
      name: "Alice",
    },
  })

  const user2 = await prisma.user.create({
    data: {
      email: "bob@example.com",
      name: "Bob",
    },
  })

  // 创建两篇文章
  const post1 = await prisma.post.create({
    data: {
      title: "第一篇测试文章",
      content: "这是 Alice 写的测试文章内容，欢迎使用 Prisma！",
      published: true,
    },
  })

  const post2 = await prisma.post.create({
    data: {
      title: "第二篇测试文章",
      content: "这是 Bob 写的草稿文章，还没有发布。",
      published: false,
    },
  })

  console.log("✅ 数据填充成功！")
  console.log("用户:", { user1, user2 })
  console.log("文章:", { post1, post2 })
}

main()
  .catch((e) => {
    console.error("❌ 填充数据失败:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
