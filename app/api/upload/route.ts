import { NextRequest, NextResponse } from "next/server"
import { writeFile } from "fs/promises"
import { mkdir } from "fs/promises"
import { join } from "path"

// 允许的文件类型
const ALLOWED_TYPES = ["application/pdf"]

// 最大文件大小 10MB
const MAX_SIZE = 10 * 1024 * 1024

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "没有选择文件" }, { status: 400 })
    }

    // 验证文件类型
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "只允许上传 PDF 文件" },
        { status: 400 }
      )
    }

    // 验证文件大小
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "文件大小不能超过 10MB" },
        { status: 400 }
      )
    }

    // 创建上传目录
    const uploadDir = join(process.cwd(), "uploads")
    await mkdir(uploadDir, { recursive: true })

    // 生成唯一文件名
    const timestamp = Date.now()
    const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_")
    const filename = `${timestamp}_${originalName}`
    const filepath = join(uploadDir, filename)

    // 写入文件
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filepath, buffer)

    return NextResponse.json({
      success: true,
      message: "文件上传成功",
      data: {
        filename,
        originalName: file.name,
        size: file.size,
        type: file.type,
        path: `/uploads/${filename}`,
      },
    })
  } catch (error) {
    console.error("上传错误:", error)
    return NextResponse.json({ error: "上传失败，请重试" }, { status: 500 })
  }
}
