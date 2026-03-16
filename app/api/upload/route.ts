import { NextRequest, NextResponse } from "next/server"
import { uploadPDFFile } from "@/lib/services/pdfService"
import { isAllowedFileType, isValidFileSize } from "@/lib/utils/fileUtils"

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
    if (!isAllowedFileType(file.type, ALLOWED_TYPES)) {
      return NextResponse.json(
        { error: "只允许上传 PDF 文件" },
        { status: 400 }
      )
    }

    // 验证文件大小
    if (!isValidFileSize(file.size, MAX_SIZE)) {
      return NextResponse.json(
        { error: "文件大小不能超过 10MB" },
        { status: 400 }
      )
    }

    // 调用服务层上传文件
    const result = await uploadPDFFile(file)

    return NextResponse.json({
      success: true,
      message: "文件上传成功",
      data: result,
    })
  } catch (error) {
    console.error("上传错误:", error)
    return NextResponse.json({ error: "上传失败，请重试" }, { status: 500 })
  }
}
