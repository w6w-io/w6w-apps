import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-user.ts";

Deno.test("get-user: GETs /user and returns the body verbatim", async () => {
  const { ctx, calls } = mockCtx([{
    status: 201,
    body: { id: "u1", name: "Ada Lovelace", email: "ada@example.com" },
  }]);
  const out = await action.execute({}, ctx);
  assertEquals(calls[0].url, "https://api.folk.app/user");
  assertEquals(out, { id: "u1", name: "Ada Lovelace", email: "ada@example.com" });
});
