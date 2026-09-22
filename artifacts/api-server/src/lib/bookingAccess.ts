import type { Order } from "@workspace/db";

export const providerPrivateBookingStatuses = [
  "accepted",
  "completed",
] as const satisfies readonly Order["status"][];

export function providerCanAccessPrivateBooking(
  status: Order["status"],
): boolean {
  return providerPrivateBookingStatuses.some((allowed) => allowed === status);
}