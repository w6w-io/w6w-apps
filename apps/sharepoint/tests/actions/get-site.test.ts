import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-site.ts";

Deno.test("get-site: no addressing means the tenant root site", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "root-site" } }]);
  await action.execute({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/sites/root");
  assertEquals(calls[0].method, "GET");
});

Deno.test("get-site: by Site ID", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ siteId: "contoso.sharepoint.com,A,B" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/sites/contoso.sharepoint.com%2CA%2CB");
});

Deno.test("get-site: by Hostname + Path, the structural colon form", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ hostname: "contoso.sharepoint.com", path: "teams/hr" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/sites/contoso.sharepoint.com:/teams/hr");
});

Deno.test("get-site: Site ID and Hostname together is rejected before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  try {
    await action.execute({ siteId: "a", hostname: "contoso.sharepoint.com" }, ctx);
    throw new Error("expected a throw");
  } catch (e) {
    assert((e as Error).message.includes("not both"));
  }
  assertEquals(calls.length, 0);
});

Deno.test("get-site: $select and $expand ride as query parameters", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ select: ["displayName", "webUrl"], expand: ["drive"] }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("$select"), "displayName,webUrl");
  assertEquals(url.searchParams.get("$expand"), "drive");
});

Deno.test("get-site: is read-only — this App offers no create/update/delete for a site", () => {
  assertEquals(action.type, "read");
});
