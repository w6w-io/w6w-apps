import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-credits.ts";

Deno.test("get-credits: GETs /v2/getcredits and returns the body verbatim", async () => {
  const { ctx, calls } = mockCtx([{ body: { Credits: 2375323 } }]);
  const result = await action.execute!({}, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://api.zerobounce.net");
  assertEquals(url.pathname, "/v2/getcredits");
  assertEquals(result, { Credits: 2375323 });
});

Deno.test("get-credits: honors the region param", async () => {
  const { ctx, calls } = mockCtx([{ body: { Credits: 100 } }]);
  await action.execute!({ region: "us" }, ctx);
  assertEquals(new URL(calls[0].url).host, "api-us.zerobounce.net");
});

Deno.test("get-credits: is a read action scoped to the account resource", () => {
  assertEquals(action.type, "read");
  assertEquals(action.resource, "account");
});
