import { assertEquals } from "@std/assert";
import requestRate from "../../health/request-rate.ts";

Deno.test("request-rate: declared unavailable, informational, no check hook", () => {
  assertEquals(typeof requestRate.check, "undefined");
  assertEquals(typeof requestRate.unavailable?.reason, "string");
  assertEquals(requestRate.severity, "informational");
});
