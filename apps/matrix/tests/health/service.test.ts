import { assert, assertEquals } from "@std/assert";
import service from "../../health/service.ts";

/**
 * Matrix is a federated protocol — there is no single vendor platform behind a
 * Connection, so there is nothing one status page could say about it.
 */
Deno.test("service: is a declared absence, and explains why the question does not apply", () => {
  assertEquals(service.check, undefined);
  assertEquals(service.kind, "service");
  assertEquals(service.severity, "informational");
  const reason = service.unavailable!.reason;
  assert(reason.includes("federated"), reason);
  assert(reason.includes("status.matrix.org"), reason);
  assert(reason.includes("2026-09-06"), reason);
});
