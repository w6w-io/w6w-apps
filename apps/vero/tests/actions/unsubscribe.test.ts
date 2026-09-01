import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/unsubscribe.ts";

Deno.test("unsubscribe: POSTs id to /users/unsubscribe", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { status: 200, message: "Success." } }]);
  const result = await action.execute!({ id: "u1" }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].url, "https://api.getvero.com/api/v2/users/unsubscribe");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { id: "u1" });
  assertEquals(result, { success: true, message: "Success." });
});

Deno.test("unsubscribe: rejects a blank id", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () => await action.execute!({ id: "" }, ctx),
    Error,
    "`id` is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("unsubscribe: a non-2xx response propagates as an Error", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { status: 404, message: "not found" } }]);
  const err = await assertRejects(
    async () => await action.execute!({ id: "u1" }, ctx),
    Error,
    "Vero 404",
  );
  assert(err.message.includes("not found"));
});
