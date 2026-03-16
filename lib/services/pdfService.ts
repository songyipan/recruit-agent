import { writeFile, mkdir, readFile } from "fs/promises"
import { join } from "path"

// 动态导入 pdf-parse-fork
async function parsePDF(buffer: Buffer) {
  const pdfParse = (await import("pdf-parse-fork")).default
  return pdfParse(buffer)
}

export async function uploadPDFFile(file: File) {
  const uploadDir = join(process.cwd(), "uploads")
  await mkdir(uploadDir, { recursive: true })

  const timestamp = Date.now()
  const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_")
  const filename = `${timestamp}_${originalName}`
  const filepath = join(uploadDir, filename)

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)
  await writeFile(filepath, buffer)

  return {
    filename,
    originalName: file.name,
    size: file.size,
    path: `/uploads/${filename}`,
  }
}

export async function parsePDFFromURL(pdfUrl: string) {
  const response = await fetch(pdfUrl)
  if (!response.ok) {
    throw new Error(`无法获取 PDF 文件: ${response.status}`)
  }

  const arrayBuffer = await response.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const data = await parsePDF(buffer)

  return {
    text: data.text,
    numpages: data.numpages,
    info: data.info,
  }
}

export async function readLocalPDFFile(filename: string): Promise<Buffer> {
  if (filename.includes("..") || filename.includes("~")) {
    throw new Error("非法的文件路径")
  }

  const filePath = join(process.cwd(), "uploads", filename)
  return readFile(filePath)
}
