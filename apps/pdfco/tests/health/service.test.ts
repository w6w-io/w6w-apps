import { assert, assertEquals } from "@std/assert";
import service from "../../health/service.ts";

Deno.test("service: declared unavailable, not a live probe", () => {
  assertEquals(typeof service.check, "undefined");
  assert(service.unavailable?.reason.length ?? 0 > 0);
});

Deno.test("service: unavailable check is informational, so it never pins the App at unknown", () => {
  assertEquals(service.severity, "informational");
});

Deno.test("service: reasons name both checked hosts as unclaimed, not just one", () => {
  const reason = service.unavailable?.reason ?? "";
  assert(reason.includes("status.pdf.co"), "does not mention status.pdf.co");
  assert(reason.includes("statuspage.io"), "does not mention the Statuspage placeholder");
});
