/**
 * 验证文件名是否安全（防止目录遍历攻击）
 */
export function isValidFilename(filename: string): boolean {
  if (!filename) return false
  if (filename.includes("..") || filename.includes("~")) return false
  return true
}

/**
 * 生成安全的文件名
 */
export function generateSafeFilename(originalName: string): string {
  const timestamp = Date.now()
  const safeName = originalName.replace(/[^a-zA-Z0-9.-]/g, "_")
  return `${timestamp}_${safeName}`
}

/**
 * 验证文件类型
 */
export function isAllowedFileType(fileType: string, allowedTypes: string[]): boolean {
  return allowedTypes.includes(fileType)
}

/**
 * 验证文件大小
 */
export function isValidFileSize(fileSize: number, maxSize: number): boolean {
  return fileSize <= maxSize
}
