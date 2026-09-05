import { assert, assertEquals, assertRejects } from "@std/assert";
import contactGet from "../../actions/contact-get.ts";
import { authFailureResponse, envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("contact-get: calls GET /1/Contact?id=... and unwraps data", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "7", firstname: "Mary" }) }]);
  const out = await contactGet.execute({ id: "7" }, ctx) as { firstname: string };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/1/Contact");
  assertEquals(queryOf(calls[0].url), { id: "7" });
  assertEquals(out.firstname, "Mary");
});

Deno.test("contact-get: a bad connection's plain-text auth failure surfaces as an Error, not a crash", async () => {
  const { ctx } = mockCtx([authFailureResponse()]);
  const err = await assertRejects(() => Promise.resolve(contactGet.execute({ id: "7" }, ctx)));
  assert(err instanceof Error);
  assert(/does not authenticate/i.test(err.message), err.message);
});
