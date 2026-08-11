import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/get-list.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("get-list: GETs /lists/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "l1", name: "Clients" } }]);
  const out = await action.execute!({ listId: "l1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/lists/l1");
  assertEquals(calls[0].method, "GET");
  assertEquals(out, { id: "l1", name: "Clients" });
});

Deno.test("get-list: percent-encodes the id into the path", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ listId: "a/b c" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/lists/a%2Fb%20c");
});

Deno.test("get-list: surfaces the RFC 7807 detail and type on a 404", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: {
      title: "An error occurred.",
      detail: "Resource not found.",
      status: 404,
      type: "https://emailoctopus.com/api-documentation/v2#not-found",
    },
  }]);
  const err = await assertRejects(
    () => Promise.resolve(action.execute!({ listId: "nope" }, ctx)),
    Error,
  );
  assertEquals(err.message.includes("Resource not found."), true);
  assertEquals(err.message.includes("#not-found"), true);
});
