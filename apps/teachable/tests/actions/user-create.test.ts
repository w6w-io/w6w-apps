import { assertEquals } from "@std/assert";
import userCreate from "../../actions/user-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("user-create: posts only the fields given, dropping unset ones", async () => {
  const { ctx, calls } = mockCtx([
    {
      status: 201,
      body: { name: null, email: "a@b.com", role: "student", id: 1, courses: [], tags: [] },
    },
  ]);
  await userCreate.execute({ email: "a@b.com" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/users");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { email: "a@b.com" });
});

Deno.test("user-create: is declared not idempotent", () => {
  assertEquals(userCreate.idempotent, false);
});
