import { assertEquals } from "@std/assert";
import { mockKustomerCtx } from "../_helpers.ts";
import action from "../../actions/user-list.ts";

Deno.test("user-list: GETs /users with the optional filters", async () => {
  const { ctx, calls } = mockKustomerCtx([{ body: { data: [], meta: { page: 1 } } }]);
  const out = await action.execute({ userType: "machine", email: "bot@acme.test" }, ctx);
  assertEquals(
    calls[0].url,
    "https://acme.api.kustomerapp.com/v1/users?userType=machine&email=bot%40acme.test",
  );
  assertEquals(out, { data: [], meta: { page: 1 } });
});
