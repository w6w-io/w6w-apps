import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-models.ts";

Deno.test("list-models: GETs /v1/models and returns the response verbatim", async () => {
  const body = { object: "list", data: [{ id: "mistral-large-latest" }] };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({}, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://api.mistral.ai");
  assertEquals(url.pathname, "/v1/models");
  assertEquals(calls[0].method, "GET");
  assertEquals(result, body);
});
