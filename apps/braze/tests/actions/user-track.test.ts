import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/user-track.ts";

const display = { display: { instance: "iad-01" } };

Deno.test("user-track: posts attributes, events and purchases to /users/track", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { message: "success" } }], display);
  const result = await action.execute!({
    attributes: [{ email: "a@b.com", string_attribute: "fruit" }],
    events: [{ email: "a@b.com", name: "rented_movie" }],
  }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/users/track");
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.attributes, [{ email: "a@b.com", string_attribute: "fruit" }]);
  assertEquals(body.events, [{ email: "a@b.com", name: "rented_movie" }]);
  assertEquals(body.purchases, undefined);
  assertEquals(result, { message: "success" });
});

Deno.test("user-track: uses the connection's instance host", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }], { display: { instance: "fra-02" } });
  await action.execute!({ attributes: [{ email: "a@b.com" }] }, ctx);
  assertEquals(new URL(calls[0].url).host, "rest.fra-02.braze.eu");
});
