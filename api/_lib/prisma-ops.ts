import { Prisma } from '@prisma/client';

/** Shown to the user when paid-run persistence fails after a successful on-chain payment. */
export const PAYMENT_DB_ERROR_MESSAGE =
  'Payment could not be saved, please try again';

export function isPrismaConnectionError(err: unknown): boolean {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    return ['P1001', 'P1002', 'P1008', 'P1017'].includes(err.code);
  }
  if (err instanceof Prisma.PrismaClientInitializationError) {
    return true;
  }
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes('E57P01') ||
    msg.includes('terminating connection') ||
    msg.includes("Can't reach database server") ||
    msg.includes('Connection terminated') ||
    msg.includes('Server has closed the connection')
  );
}

/** Retry only transient connection failures (safe for idempotent reads/writes). */
export async function withPrismaRetry<T>(
  label: string,
  fn: () => Promise<T>,
  opts?: { maxAttempts?: number },
): Promise<T> {
  const maxAttempts = opts?.maxAttempts ?? 3;
  let lastErr: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!isPrismaConnectionError(err) || attempt >= maxAttempts) {
        throw err;
      }
      const delayMs = 75 * attempt;
      console.warn(
        `[prisma] ${label}: connection error (attempt ${attempt}/${maxAttempts}), retry in ${delayMs}ms`,
        err instanceof Error ? err.message : err,
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastErr;
}

export async function prismaOp<T>(
  step: string,
  context: Record<string, unknown>,
  fn: () => Promise<T>,
): Promise<T> {
  console.log(`[payment-db] before ${step}`, context);
  try {
    const result = await withPrismaRetry(step, fn);
    console.log(`[payment-db] after ${step}`, { ...context, ok: true });
    return result;
  } catch (err) {
    console.error(`[payment-db] failed ${step}`, context, err);
    throw err;
  }
}
