import { assert, assertEquals } from "@std/assert";
import requestRate from "../../health/request-rate.ts";

Deno.test("request-rate: declared unavailable, informational, with no check hook", () => {
  assertEquals(typeof requestRate.check, "undefined");
  assert(
    typeof requestRate.unavailable?.reason === "string" &&
      requestRate.unavailable.reason.length > 0,
  );
  assertEquals(requestRate.severity, "informational");
});
