import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-constituent.ts";

Deno.test("get-constituent: is a read action", () => {
  assertEquals(action.type, "read");
});

Deno.test("get-constituent: GETs /constituent/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { Id: 1234 } }]);
  const result = await action.execute({ id: 1234 }, ctx) as { Id: number };
  assertEquals(new URL(calls[0].url).pathname, "/v2/constituent/1234");
  assertEquals(result.Id, 1234);
});
