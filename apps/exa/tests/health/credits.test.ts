import { assertEquals, assertExists } from "@std/assert";
import credits from "../../health/credits.ts";

Deno.test("credits: declared unavailable, no check hook, informational severity", () => {
  assertEquals(credits.check, undefined);
  assertExists(credits.unavailable);
  assertEquals(credits.severity, "informational");
  assertEquals(credits.kind, "quota");
});
