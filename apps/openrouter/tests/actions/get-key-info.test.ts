import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-key-info.ts";

Deno.test("get-key-info: GETs /key with no params and returns the vendor's body", async () => {
  const body = { data: { label: "sk-or-v1-a...b", limit: 100, limit_remaining: 74.5 } };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({}, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1/key");
  assertEquals(url.search, "");
  assertEquals(calls[0].method, "GET");
  assertEquals(result, body);
});
