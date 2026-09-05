import { assertEquals } from "@std/assert";
import connectorList from "../../actions/connector-list.ts";
import { mockCtx, okBody, pathOf } from "../_helpers.ts";

Deno.test("connector-list: gets /v2/connector.list and returns the array unwrapped", async () => {
  const { ctx, calls } = mockCtx([{
    body: okBody({ data: [{ id: "gmail", name: "Gmail", type: "builtin" }] }),
  }]);
  const out = await connectorList.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/connector.list");
  assertEquals(out, [{ id: "gmail", name: "Gmail", type: "builtin" }]);
});
