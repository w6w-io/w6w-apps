import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-models.ts";

Deno.test("list-models: GETs /models and returns the body verbatim", async () => {
  const body = {
    object: "list",
    data: [
      { id: "deepseek-v4-flash", object: "model", owned_by: "deepseek" },
      { id: "deepseek-v4-pro", object: "model", owned_by: "deepseek" },
    ],
  };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({}, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://api.deepseek.com");
  assertEquals(url.pathname, "/models");
  assertEquals(calls[0].method, "GET");
  assertEquals(result, body);
});

Deno.test("list-models: is a read action with no params", () => {
  assertEquals(action.type, "read");
  assertEquals(action.params, []);
});
