/**
 * Recursively convert Prisma Decimal fields to plain numbers
 * so JSON serialization produces numbers, not strings.
 */
export function serialize<T>(data: T): T {
  if (data === null || data === undefined) return data;
  if (data instanceof Date) return data;
  // Prisma Decimal has a toNumber() method — duck-type check
  if (
    typeof data === "object" &&
    "toNumber" in (data as object) &&
    typeof (data as Record<string, unknown>).toNumber === "function"
  ) {
    return (data as unknown as { toNumber(): number }).toNumber() as unknown as T;
  }
  if (Array.isArray(data)) return data.map(serialize) as unknown as T;
  if (typeof data === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      result[key] = serialize(value);
    }
    return result as T;
  }
  return data;
}
