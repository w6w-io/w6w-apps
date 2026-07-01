import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-create.ts";

Deno.test("list-create: POST /marketing/lists with { name }", async () => {
  const { ctx, calls } = mockCtx([
    { status: 201, body: { id: "list-1", name: "VIPs", contact_count: 0 } },
  ]);
  const result = await action.execute!({ name: "VIPs" }, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.sendgrid.com/v3/marketing/lists");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body ?? ""), { name: "VIPs" });
  assertEquals(result, { id: "list-1", name: "VIPs", contact_count: 0 });
});

Deno.test("list-create: missing name rejects", async () => {
  const { ctx } = mockCtx();
  await assertRejects(
    async () => await action.execute!({ name: "" }, ctx),
    Error,
    "`name`",
  );
});
