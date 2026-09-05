import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/user-update.ts";

const conn = { display: { schoolDomain: "https://yourschool.learnworlds.com" } };

Deno.test("user-update: PUTs to /v2/users/{id} with only the provided fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "1" } }], conn);
  await action.execute!({ id: "1", username: "newname" }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(calls[0].url, "https://yourschool.learnworlds.com/admin/api/v2/users/1");
  assertEquals(JSON.parse(calls[0].body!), { username: "newname" });
});

Deno.test("user-update: idempotent is true — the same edit twice leaves the same state", () => {
  assertEquals(action.idempotent, true);
});
