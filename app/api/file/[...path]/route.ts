import { NextRequest, NextResponse } from "next/server"
import { readFile } from "fs/promises"
import { join } from "path"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params
    const filename = path.join("/")
    
    // 安全检查：防止目录遍历攻击
    if (filename.includes("..") || filename.includes("~")) {
      return NextResponse.json(
        { error: "非法的文件路径" },
        { status: 400 }
      )
    }

    const filePath = join(process.cwd(), "uploads", filename)
    
    // 读取文件
    const fileBuffer = await readFile(filePath)
    
    // 根据文件扩展名设置 Content-Type
    const ext = filename.split(".").pop()?.toLowerCase()
    let contentType = "application/octet-stream"
    
    switch (ext) {
      case "pdf":
        contentType = "application/pdf"
        break
      case "jpg":
      case "jpeg":
        contentType = "image/jpeg"
        break
      case "png":
        contentType = "image/png"
        break
      case "gif":
        contentType = "image/gif"
        break
      case "txt":
        contentType = "text/plain"
        break
    }

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error("文件读取错误:", error)
    return NextResponse.json(
      { error: "文件不存在或无法访问" },
      { status: 404 }
    )
  }
}
