import { assertEquals } from "@std/assert";
import usersUpdate from "../../actions/users-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("users-update: PATCHes /users/{id} and splits comma lists into arrays", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "1" } }]);
  await usersUpdate.execute(
    { userId: "1", emails: "a@b.com, c@d.com", state: "suspended" },
    ctx,
  );
  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/api/v2/users/1");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.emails, ["a@b.com", "c@d.com"]);
  assertEquals(body.state, "suspended");
});

Deno.test("users-update: declared idempotent — a PATCH replaces the named fields wholesale", () => {
  assertEquals(usersUpdate.idempotent, true);
});
