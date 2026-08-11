import { assert, assertEquals, assertRejects } from "@std/assert";
import tagCreate from "../../actions/tag-create.ts";
import { appErrorBody, bodyOf, entityBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("tag-create: POSTs /v1/tags with name and colour", async () => {
  const { ctx, calls } = mockCtx([
    { status: 201, body: entityBody("tag", { id: 681, name: "VIP Customer" }) },
  ]);
  const out = await tagCreate.execute({ name: "VIP Customer", color: "#00B388" }, ctx) as {
    id: number;
  };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/tags");
  assertEquals(bodyOf(calls[0]), { name: "VIP Customer", color: "#00B388" });
  assertEquals(out.id, 681);
});

/**
 * Tag names are unique company-wide, so a replay of a create that already
 * succeeded 400s. That is why this action is not marked retryable, and why the
 * 400 has to stay readable.
 */
Deno.test("tag-create: a duplicate-name 400 surfaces its vendor message", async () => {
  const { ctx } = mockCtx([
    { status: 400, body: appErrorBody("Bad Request", "Name has already been taken") },
  ]);
  const err = await assertRejects(
    () => Promise.resolve(tagCreate.execute({ name: "VIP Customer", color: "#00B388" }, ctx)),
    Error,
  );
  assert(err.message.includes("Name has already been taken"), err.message);
  assertEquals(tagCreate.idempotent, false);
});
