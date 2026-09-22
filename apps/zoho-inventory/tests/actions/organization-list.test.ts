import { assertEquals } from "@std/assert";
import { mockInventoryCtx } from "../_helpers.ts";
import action from "../../actions/organization-list.ts";

/**
 * `GET /organizations` is the discovery call: it is the ONE endpoint that
 * must not carry `organization_id`.
 */
Deno.test("organization-list: GETs /organizations with no organization_id query param", async () => {
  const { ctx, calls } = mockInventoryCtx([
    { body: { code: 0, message: "success", organizations: [{ organization_id: "10234695" }] } },
  ]);
  const out = await action.execute({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.host, "www.zohoapis.com");
  assertEquals(url.pathname, "/inventory/v1/organizations");
  assertEquals(url.searchParams.has("organization_id"), false);
  assertEquals(out, { organizations: [{ organization_id: "10234695" }] });
});

Deno.test("organization-list: a missing organizations key answers an empty list, not a throw", async () => {
  const { ctx } = mockInventoryCtx([{ body: { code: 0, message: "success" } }]);
  assertEquals(await action.execute({}, ctx), { organizations: [] });
});

Deno.test("organization-list: declares no params at all", () => {
  assertEquals(action.params, []);
  assertEquals(action.type, "read");
});
