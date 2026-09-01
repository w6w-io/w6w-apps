import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/edit-tags.ts";

Deno.test("edit-tags: PUTs id/add/remove to /users/tags/edit", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { status: 200, message: "Success." } }]);
  const result = await action.execute!({ id: "u1", add: ["prospect"], remove: ["cold"] }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].url, "https://api.getvero.com/api/v2/users/tags/edit");
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { id: "u1", add: ["prospect"], remove: ["cold"] });
  assertEquals(result, { success: true, message: "Success." });
});

Deno.test("edit-tags: add-only is valid", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { status: 200, message: "Success." } }]);
  await action.execute!({ id: "u1", add: ["prospect"] }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { id: "u1", add: ["prospect"], remove: [] });
});

Deno.test("edit-tags: rejects a blank id", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () => await action.execute!({ id: "", add: ["a"] }, ctx),
    Error,
    "`id` is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("edit-tags: rejects when both add and remove are empty", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () => await action.execute!({ id: "u1" }, ctx),
    Error,
    "at least one of `add` or `remove` is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("edit-tags: a non-2xx response propagates as an Error", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { status: 404, message: "not found" } }]);
  const err = await assertRejects(
    async () => await action.execute!({ id: "u1", add: ["x"] }, ctx),
    Error,
    "Vero 404",
  );
  assert(err.message.includes("not found"));
});
