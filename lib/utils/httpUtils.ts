import { NextRequest } from "next/server"

/**
 * 从请求中获取参数（支持 JSON 和 form-data）
 */
export async function getRequestParam(
  request: NextRequest,
  paramName: string
): Promise<string | null> {
  const contentType = request.headers.get("content-type") || ""

  if (contentType.includes("application/json")) {
    const body = await request.json()
    return body[paramName] || null
  }

  if (
    contentType.includes("multipart/form-data") ||
    contentType.includes("application/x-www-form-urlencoded")
  ) {
    const formData = await request.formData()
    return formData.get(paramName) as string
  }

  return null
}

/**
 * 获取 Content-Type
 */
export function getContentType(request: NextRequest): string {
  return request.headers.get("content-type") || ""
}

/**
 * 检查是否支持的内容类型
 */
export function isSupportedContentType(contentType: string): boolean {
  return (
    contentType.includes("application/json") ||
    contentType.includes("multipart/form-data") ||
    contentType.includes("application/x-www-form-urlencoded")
  )
}

export async function getSupportedRequestPayload(
  request: NextRequest
): Promise<Record<string, FormDataEntryValue | unknown>> {
  const contentType = request.headers.get("content-type") || ""

  if (contentType.includes("application/json")) {
    const body = (await request.json()) as unknown

    if (body && typeof body === "object" && !Array.isArray(body)) {
      return body as Record<string, unknown>
    }

    return {}
  }

  if (
    contentType.includes("multipart/form-data") ||
    contentType.includes("application/x-www-form-urlencoded")
  ) {
    const formData = await request.formData()
    return Object.fromEntries(formData.entries())
  }

  return {}
}
