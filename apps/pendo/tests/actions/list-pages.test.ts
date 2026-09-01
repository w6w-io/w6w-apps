import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-pages.ts";

Deno.test("list-pages: fetches every page when no ids given", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ id: "p1" }] }]);
  const result = await action.execute!({}, ctx) as { pages: unknown[] };
  assertEquals(calls[0].url, "https://app.pendo.io/api/v1/page");
  assertEquals(result.pages, [{ id: "p1" }]);
});

Deno.test("list-pages: filters by comma-separated ids", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }]);
  await action.execute!({ ids: "p1, p2" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("id"), "p1,p2");
});

Deno.test("list-pages: reads the api host for the connection's region", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }], { display: { region: "EU" } });
  await action.execute!({}, ctx);
  assertEquals(calls[0].url, "https://app.eu.pendo.io/api/v1/page");
});
