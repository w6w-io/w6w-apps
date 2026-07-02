import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-contact.ts";

Deno.test("get-contact: GETs /v3/contacts/{id} with the identifier url-encoded", async () => {
  const body = { id: 1, email: "ada@x.com" };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({ identifier: "ada@x.com" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v3/contacts/ada%40x.com");
  assertEquals(calls[0].method, "GET");
  assertEquals(result, body);
});

Deno.test("get-contact: encodes special characters in the identifier", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ identifier: "a b+c@x.com" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v3/contacts/a%20b%2Bc%40x.com");
});
