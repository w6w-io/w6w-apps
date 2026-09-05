import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-design.ts";

Deno.test("get-design: GETs /rest/v1/designs/{id} and unwraps the design envelope", async () => {
  const { ctx, calls } = mockCtx([{ body: { design: { id: "abc123", title: "My design" } } }]);
  const result = await action.execute({ designId: "abc123" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/rest/v1/designs/abc123");
  assertEquals(calls[0].method, "GET");
  assertEquals(result, { id: "abc123", title: "My design" });
});

Deno.test("get-design: encodes the design ID in the path", async () => {
  const { ctx, calls } = mockCtx([{ body: { design: {} } }]);
  await action.execute({ designId: "a/b c" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/rest/v1/designs/a%2Fb%20c");
});
