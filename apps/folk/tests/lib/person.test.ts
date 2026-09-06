import { assertEquals } from "@std/assert";
import { buildPersonBody } from "../../lib/person.ts";

Deno.test("buildPersonBody: drops unset fields", () => {
  assertEquals(buildPersonBody({ fullName: "Ada Lovelace" }), { fullName: "Ada Lovelace" });
});

Deno.test("buildPersonBody: passes arrays through untouched", () => {
  const body = buildPersonBody({
    fullName: "Ada",
    emails: ["ada@example.com"],
    phones: ["+1 555 0100"],
  });
  assertEquals(body, {
    fullName: "Ada",
    emails: ["ada@example.com"],
    phones: ["+1 555 0100"],
  });
});

Deno.test("buildPersonBody: passes customFields through untouched", () => {
  const body = buildPersonBody({ customFields: { Role: ["Investor"] } });
  assertEquals(body, { customFields: { Role: ["Investor"] } });
});
