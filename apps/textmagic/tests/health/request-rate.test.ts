import { assert, assertEquals } from "@std/assert";
import requestRate from "../../health/request-rate.ts";

Deno.test("request-rate: declared unavailable at informational severity", () => {
  assertEquals(requestRate.check, undefined);
  assertEquals(requestRate.severity, "informational");
  assert(requestRate.unavailable?.reason && requestRate.unavailable.reason.length > 0);
});
