import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-get.ts";

Deno.test("list-get: GET /marketing/lists/{id} with contact_sample=false by default", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { id: "list-1", name: "VIPs", contact_count: 42 } },
  ]);
  const result = await action.execute!({ listId: "list-1" }, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(
    calls[0].url,
    "https://api.sendgrid.com/v3/marketing/lists/list-1?contact_sample=false",
  );
  assertEquals(result, { id: "list-1", name: "VIPs", contact_count: 42 });
});

Deno.test("list-get: contactSample=true flips the flag", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute!({ listId: "list-1", contactSample: true }, ctx);

  assertEquals(
    calls[0].url,
    "https://api.sendgrid.com/v3/marketing/lists/list-1?contact_sample=true",
  );
});

Deno.test("list-get: missing listId rejects", async () => {
  const { ctx } = mockCtx();
  await assertRejects(
    async () => await action.execute!({ listId: "" }, ctx),
    Error,
    "`listId`",
  );
});
