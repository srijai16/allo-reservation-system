import { createHash } from "crypto"
import { NextResponse } from "next/server"
import { redis } from "@/lib/redis"

type CachedResponse = {
  requestHash: string
  statusCode: number
  responseBody: unknown
}

export function getIdempotencyKey(req: Request) {
  return req.headers.get("Idempotency-Key")
}

export function hashBody(body: unknown) {
  return createHash("sha256").update(JSON.stringify(body)).digest("hex")
}

export async function getCachedIdempotentResponse(
  key: string,
  endpoint: string,
  requestHash: string
) {
  const redisKey = `idempotency:${endpoint}:${key}`

  const cached = await redis.get<CachedResponse>(redisKey)

  if (!cached) return null

  if (cached.requestHash !== requestHash) {
    return NextResponse.json(
      { error: "Idempotency-Key reused with different request body" },
      { status: 409 }
    )
  }

  return NextResponse.json(cached.responseBody, {
    status: cached.statusCode,
  })
}

export async function saveIdempotentResponse(input: {
  key: string
  endpoint: string
  requestHash: string
  statusCode: number
  responseBody: unknown
}) {
  const redisKey = `idempotency:${input.endpoint}:${input.key}`

  await redis.set(
    redisKey,
    {
      requestHash: input.requestHash,
      statusCode: input.statusCode,
      responseBody: input.responseBody,
    },
    {
      ex: 60 * 60,
    }
  )
}