import { assertEquals } from "@std/assert";
import { mockDripCtx } from "../_helpers.ts";
import action from "../../actions/get-subscriber.ts";

Deno.test("get-subscriber: GETs /subscribers/:idOrEmail, url-encoded", async () => {
  const { ctx, calls } = mockDripCtx([{
    body: { subscribers: [{ id: "abc", email: "john+test@acme.com" }] },
  }]);
  const out = await action.execute({ idOrEmail: "john+test@acme.com" }, ctx);
  assertEquals(
    calls[0].url,
    "https://api.getdrip.com/v2/1234567/subscribers/john%2Btest%40acme.com",
  );
  assertEquals(out, { id: "abc", email: "john+test@acme.com" });
});

Deno.test("get-subscriber: defaults to an empty object when Drip returns none", async () => {
  const { ctx } = mockDripCtx([{ body: {} }]);
  assertEquals(await action.execute({ idOrEmail: "abc" }, ctx), {});
});
