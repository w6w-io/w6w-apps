import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/user-get-self.ts";

const conn = { display: { baseUrl: "https://mautic.example.com" } };

Deno.test("user-get-self: GETs /users/self and returns the profile", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 3, username: "r.green" } }], conn);
  const out = await action.execute!({}, ctx);
  assertEquals(calls[0].url, "https://mautic.example.com/api/users/self");
  assertEquals(out, { id: 3, username: "r.green" });
});

Deno.test("user-get-self: takes no params", () => {
  assertEquals(action.params, []);
});
