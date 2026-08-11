import { assert, assertEquals } from "@std/assert";
import appGet from "../../actions/app-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const APP = {
  app_id: 123,
  space_id: 7,
  status: "active",
  token: "the-app-token-that-mints-access-tokens",
  push: { channel: "/app/123", signature: "sig", timestamp: 1 },
  config: { name: "Leads", item_name: "Lead" },
  fields: [{ field_id: 1, type: "text", external_id: "title" }],
  rights: ["view", "add_item"],
};

Deno.test("app-get: GETs one app definition", async () => {
  const { ctx, calls } = mockCtx([{ body: APP }]);
  await appGet.execute({ appId: "123" }, ctx);
  assertEquals(pathOf(calls[0].url), "/app/123");
  assertEquals(calls[0].method, "GET");
});

/**
 * The finding this action exists to contain. `GET /app/{app_id}` returns
 * "The app token to use when logging in as an app" — the credential half of the
 * App Authentication grant. Returning it would put a permanent write credential
 * into the run record.
 */
Deno.test("app-get: the app token never reaches the result", async () => {
  const { ctx } = mockCtx([{ body: APP }]);
  const out = await appGet.execute({ appId: "123" }, ctx) as { app: Record<string, unknown> };
  assertEquals(out.app.token, undefined, "the app token leaked out of a read action");
  assertEquals(out.app.push, undefined, "the push channel signature leaked");
  assert(
    !JSON.stringify(out).includes("the-app-token-that-mints-access-tokens"),
    "the app token survived somewhere in the result",
  );
});

Deno.test("app-get: everything else comes back verbatim", async () => {
  const { ctx } = mockCtx([{ body: APP }]);
  const out = await appGet.execute({ appId: "123" }, ctx) as { app: Record<string, unknown> };
  assertEquals(out.app.app_id, 123);
  assertEquals(out.app.config, { name: "Leads", item_name: "Lead" });
  assertEquals(out.app.fields, [{ field_id: 1, type: "text", external_id: "title" }]);
  assertEquals(out.app.rights, ["view", "add_item"]);
});

Deno.test("app-get: an empty body yields an empty object", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "" }]);
  assertEquals(await appGet.execute({ appId: "123" }, ctx), { app: {} });
});
