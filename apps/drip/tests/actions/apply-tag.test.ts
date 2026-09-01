import { assertEquals } from "@std/assert";
import { mockDripCtx } from "../_helpers.ts";
import action from "../../actions/apply-tag.ts";

Deno.test("apply-tag: POSTs /tags with a single-element tags array", async () => {
  const { ctx, calls } = mockDripCtx([{ status: 201, body: {} }]);
  const out = await action.execute({ email: "john@acme.com", tag: "Customer" }, ctx);
  assertEquals(calls[0].url, "https://api.getdrip.com/v2/1234567/tags");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    tags: [{ email: "john@acme.com", tag: "Customer" }],
  });
  assertEquals(out, { success: true });
});
