const RESUME_EMBEDDING_DIMENSIONS = 1536

export function toPgVectorLiteral(values: number[]): string {
  if (values.length !== RESUME_EMBEDDING_DIMENSIONS) {
    throw new Error(
      `嵌入向量维度错误，期望 ${RESUME_EMBEDDING_DIMENSIONS}，实际 ${values.length}`
    )
  }

  const normalized = values.map((value) => {
    if (!Number.isFinite(value)) {
      throw new Error("嵌入向量包含非法数值")
    }

    return value.toString()
  })

  return `[${normalized.join(",")}]`
}
