import { assertEquals } from "@std/assert";
import userUpdate from "../../actions/user-update.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("user-update: PUTs a one-element array with only the fields set", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ users: [], count: 1 }) }]);
  await userUpdate.execute({ userId: 42, firstName: "Grace" }, ctx);
  assertEquals(pathOf(calls[0].url), "/users/v1/users");
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), [{ userId: 42, firstName: "Grace" }]);
});

Deno.test("user-update: isArchived:false survives (compact keeps false)", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ users: [], count: 1 }) }]);
  await userUpdate.execute({ userId: 42, isArchived: false }, ctx);
  assertEquals(JSON.parse(calls[0].body!), [{ userId: 42, isArchived: false }]);
});

Deno.test("user-update: idempotent — same target fields, same end state", () => {
  assertEquals(userUpdate.idempotent, true);
});
