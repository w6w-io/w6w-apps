import { assertEquals } from "@std/assert";
import createUser from "../../actions/create-user.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("create-user: PUT /users with required fields, optional fields omitted when unset", async () => {
  const { ctx, calls } = mockCtx([{ body: undefined }]);
  await createUser.execute({ email: "a@b.com", name: "Dwight", roleID: "r1" }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v0/users");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body, { email: "a@b.com", name: "Dwight", roleID: "r1" });
});

Deno.test("create-user: comma-separated groupIDs are split into an array", async () => {
  const { ctx, calls } = mockCtx([{ body: undefined }]);
  await createUser.execute(
    { email: "a@b.com", name: "Dwight", roleID: "r1", groupIDs: "g1, g2" },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.groupIDs, ["g1", "g2"]);
});

Deno.test("create-user: is not idempotent — a retry would create a duplicate member", () => {
  assertEquals(createUser.idempotent, false);
});
