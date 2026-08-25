import { assertEquals } from "@std/assert";
import organizationUpdate from "../../actions/organization-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("organization-update: POSTs a JSON body", async () => {
  const { ctx, calls } = mockCtx([{ body: { key: "o1" } }]);
  await organizationUpdate.execute({ organizationKey: "o1", name: "Renamed" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v1/organizations/o1");
  assertEquals(JSON.parse(calls[0].body!), { name: "Renamed" });
});

/**
 * `domains` is sent exactly as the vendor's schema documents it — a plain
 * string — despite `GET /organizations/{key}` reading it back as an array.
 * See the note in organization-update.ts: this app does not guess an
 * encoding the spec never states.
 */
Deno.test("organization-update: domains is sent as the documented plain string", async () => {
  const { ctx, calls } = mockCtx([{ body: { key: "o1" } }]);
  await organizationUpdate.execute({ organizationKey: "o1", domains: "kittensrus.com" }, ctx);
  const body = JSON.parse(calls[0].body!) as { domains: unknown };
  assertEquals(body.domains, "kittensrus.com");
});
