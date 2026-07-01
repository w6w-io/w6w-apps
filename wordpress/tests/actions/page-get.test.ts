import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/page-get.ts";

const display = { siteUrl: "https://example.com" };

Deno.test("page-get: GETs /pages/{id} and returns the response", async () => {
  const body = { id: 5, title: { rendered: "About" } };
  const { ctx, calls } = mockCtx([{ body }], { display });
  const result = await action.execute!({ pageId: "5" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/wp-json/wp/v2/pages/5");
  assertEquals(result, body);
});

Deno.test("page-get: forwards password and context", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }], { display });
  await action.execute!({ pageId: "5", password: "sekret", context: "edit" }, ctx);
  const params = new URL(calls[0].url).searchParams;
  assertEquals(params.get("password"), "sekret");
  assertEquals(params.get("context"), "edit");
});
