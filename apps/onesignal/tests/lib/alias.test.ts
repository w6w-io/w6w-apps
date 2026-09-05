import { assertEquals } from "@std/assert";
import { aliasPath } from "../../lib/alias.ts";

Deno.test("aliasPath: defaults the label to external_id", () => {
  assertEquals(aliasPath(undefined, "user_123"), "/by/external_id/user_123");
});

Deno.test("aliasPath: honours a custom label and encodes the value", () => {
  assertEquals(aliasPath("onesignal_id", "abc def"), "/by/onesignal_id/abc%20def");
});
