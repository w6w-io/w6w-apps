import { assertEquals } from "@std/assert";
import subscriberGet from "../../actions/subscriber-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("subscriber-get: GETs /v2/subscribers/{identifier} and unwraps data", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: "o1", email: "a@b.com" } } }]);
  const out = await subscriberGet.execute({ identifier: "a@b.com" }, ctx) as { id: string };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v2/subscribers/a%40b.com");
  assertEquals(out.id, "o1");
});
