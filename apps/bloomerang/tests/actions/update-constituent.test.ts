import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/update-constituent.ts";

Deno.test("update-constituent: is an idempotent perform", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, true);
});

Deno.test("update-constituent: PUTs /constituent/{id} with only the supplied fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { Id: 99 } }]);
  await action.execute({ id: 99, status: "Inactive" }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(new URL(calls[0].url).pathname, "/v2/constituent/99");
  assertEquals(JSON.parse(calls[0].body!), { Status: "Inactive" });
});
