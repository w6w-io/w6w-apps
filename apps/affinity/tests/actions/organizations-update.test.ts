import { assertEquals } from "@std/assert";
import organizationsUpdate from "../../actions/organizations-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("organizations-update: PUTs only the provided fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 120611418, name: "Acme Corp." } }]);
  await organizationsUpdate.execute({ organizationId: 120611418, name: "Acme Corp." }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/organizations/120611418");
  assertEquals(JSON.parse(calls[0].body!), { name: "Acme Corp." });
});
