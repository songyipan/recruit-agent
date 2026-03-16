import { NextRequest, NextResponse } from "next/server"

// 动态导入 pdf-parse-fork
async function parsePDF(buffer: Buffer) {
  const pdfParse = (await import("pdf-parse-fork")).default
  return pdfParse(buffer)
}

export async function POST(request: NextRequest) {
  try {
    // 支持 JSON 和 form-data 两种格式
    let pdfUrl: string | null = null

    const contentType = request.headers.get("content-type") || ""

    if (contentType.includes("application/json")) {
      const body = await request.json()
      pdfUrl = body.pdfUrl
    } else if (
      contentType.includes("multipart/form-data") ||
      contentType.includes("application/x-www-form-urlencoded")
    ) {
      const formData = await request.formData()
      pdfUrl = formData.get("pdfUrl") as string
    } else {
      return NextResponse.json(
        {
          error: "不支持的 Content-Type，请使用 application/json 或 form-data",
        },
        { status: 400 }
      )
    }

    if (!pdfUrl) {
      return NextResponse.json({ error: "缺少 pdfUrl 参数" }, { status: 400 })
    }

    // 获取 PDF 文件
    const response = await fetch(pdfUrl)
    if (!response.ok) {
      return NextResponse.json(
        { error: `无法获取 PDF 文件: ${response.status}` },
        { status: 400 }
      )
    }

    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // 解析 PDF
    const data = await parsePDF(buffer)

    return NextResponse.json({
      success: true,
      data: {
        pdfUrl,
        text: data.text,
        numpages: data.numpages,
        info: data.info,
      },
    })
  } catch (error) {
    console.error("PDF 解析错误:", error)
    const errorMessage = error instanceof Error ? error.message : "未知错误"
    return NextResponse.json(
      {
        error: "PDF 解析失败",
        details: errorMessage,
      },
      { status: 500 }
    )
  }
}
