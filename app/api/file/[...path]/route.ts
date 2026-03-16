import { NextRequest, NextResponse } from "next/server"
import { readLocalPDFFile } from "@/lib/services/pdfService"
import { isValidFilename } from "@/lib/utils/fileUtils"

/**
 * 根据文件扩展名获取 Content-Type
 */
function getContentType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase()

  switch (ext) {
    case "pdf":
      return "application/pdf"
    case "jpg":
    case "jpeg":
      return "image/jpeg"
    case "png":
      return "image/png"
    case "gif":
      return "image/gif"
    case "txt":
      return "text/plain"
    default:
      return "application/octet-stream"
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params
    const filename = path.join("/")

    // 验证文件名安全
    if (!isValidFilename(filename)) {
      return NextResponse.json({ error: "非法的文件路径" }, { status: 400 })
    }

    // 读取文件
    const fileBuffer = await readLocalPDFFile(filename)

    // 返回文件
    return new NextResponse(fileBuffer as unknown as BodyInit, {
      headers: {
        "Content-Type": getContentType(filename),
        "Content-Disposition": `inline; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error("文件读取错误:", error)
    return NextResponse.json({ error: "文件不存在或无法访问" }, { status: 404 })
  }
}
