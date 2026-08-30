import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/campaign-list.ts";

const conn = { display: { baseUrl: "https://mautic.example.com" } };

Deno.test("campaign-list: GETs /campaigns and unwraps the `campaigns` map", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { total: 1, campaigns: { "3": { id: 3, name: "Welcome" } } } },
  ], conn);
  const out = await action.execute!({}, ctx);
  assertEquals(calls[0].url.startsWith("https://mautic.example.com/api/campaigns"), true);
  assertEquals(out, [{ id: 3, name: "Welcome" }]);
});

Deno.test("campaign-list: withContactCounts is only sent when true", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { total: 0, campaigns: {} } }], conn);
  await action.execute!({ withContactCounts: true }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("withContactCounts"), "true");
});
