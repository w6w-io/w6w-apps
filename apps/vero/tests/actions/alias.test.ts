import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/alias.ts";

Deno.test("alias: PUTs id/new_id to /users/reidentify", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { status: 200, message: "Success." } }]);
  const result = await action.execute!({ id: "old-id", newId: "new-id" }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].url, "https://api.getvero.com/api/v2/users/reidentify");
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { id: "old-id", new_id: "new-id" });
  assertEquals(result, { success: true, message: "Success." });
});

Deno.test("alias: rejects a blank id", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () => await action.execute!({ id: "  ", newId: "new-id" }, ctx),
    Error,
    "`id` is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("alias: rejects a blank newId", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () => await action.execute!({ id: "old-id", newId: "" }, ctx),
    Error,
    "`newId` is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("alias: a non-2xx response propagates as an Error", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { status: 404, message: "not found" } }]);
  const err = await assertRejects(
    async () => await action.execute!({ id: "old-id", newId: "new-id" }, ctx),
    Error,
    "Vero 404",
  );
  assert(err.message.includes("not found"));
});
