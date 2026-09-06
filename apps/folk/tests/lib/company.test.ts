import { assertEquals } from "@std/assert";
import { buildCompanyBody } from "../../lib/company.ts";

Deno.test("buildCompanyBody: drops unset fields", () => {
  assertEquals(buildCompanyBody({ name: "Acme" }), { name: "Acme" });
});

Deno.test("buildCompanyBody: passes arrays through untouched", () => {
  const body = buildCompanyBody({ name: "Acme", urls: ["https://acme.example"] });
  assertEquals(body, { name: "Acme", urls: ["https://acme.example"] });
});
