import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-list.ts";

Deno.test("create-list: POSTs a JSON:API envelope with the name", async () => {
  const body = { data: { type: "list", id: "L1" } };
  const { ctx, calls } = mockCtx([{ status: 201, body }]);
  const result = await action.execute!({ name: "New List" }, ctx);

  assertEquals(new URL(calls[0].url).pathname, "/api/lists/");
  assertEquals(calls[0].method, "POST");
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.data.type, "list");
  assertEquals(sent.data.attributes.name, "New List");
  assertEquals(result, body);
});
