import { assertEquals } from "@std/assert";
import { mockDripCtx } from "../_helpers.ts";
import action from "../../actions/list-campaigns.ts";

Deno.test("list-campaigns: GETs /campaigns with the filter params", async () => {
  const { ctx, calls } = mockDripCtx([{ body: { campaigns: [{ id: "1", name: "Onboarding" }] } }]);
  const out = await action.execute({ status: "active", sort: "name", direction: "desc" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/1234567/campaigns");
  assertEquals(url.searchParams.get("status"), "active");
  assertEquals(url.searchParams.get("sort"), "name");
  assertEquals(url.searchParams.get("direction"), "desc");
  assertEquals(out, { campaigns: [{ id: "1", name: "Onboarding" }] });
});

Deno.test("list-campaigns: defaults to an empty array with no filters", async () => {
  const { ctx, calls } = mockDripCtx([{ body: {} }]);
  const out = await action.execute({}, ctx);
  assertEquals([...new URL(calls[0].url).searchParams.keys()], []);
  assertEquals(out, { campaigns: [] });
});
