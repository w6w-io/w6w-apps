import { assertEquals, assertRejects } from "@std/assert";
import actorGet from "../../actions/actor-get.ts";
import { envelope, errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("actor-get: calls GET /v2/actors/{id} and unwraps data", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "a1", name: "web-scraper" }) }]);
  const out = await actorGet.execute({ actorId: "a1" }, ctx) as { name: string };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v2/actors/a1");
  assertEquals(out.name, "web-scraper");
});

/**
 * The `username~actor-name` form is one of Apify's three documented ways to
 * address a resource, and `~` must survive escaping or every one of them 404s.
 */
Deno.test("actor-get: the tilde in username~name survives path escaping", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "a1" }) }]);
  await actorGet.execute({ actorId: "apify~web-scraper" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/actors/apify~web-scraper");
});

Deno.test("actor-get: a slash pasted into the id cannot escape the path segment", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({}) }]);
  await actorGet.execute({ actorId: "a1/../../users/me" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/actors/a1%2F..%2F..%2Fusers%2Fme");
});

Deno.test("actor-get: an Apify error surfaces its machine-readable type", async () => {
  const { ctx } = mockCtx([
    { status: 404, body: errorBody("record-not-found", "Actor was not found.") },
  ]);
  const err = await assertRejects(
    () => Promise.resolve(actorGet.execute({ actorId: "nope" }, ctx)),
    Error,
  );
  assertEquals(err.message.includes("record-not-found"), true, err.message);
  assertEquals(err.message.includes("Actor was not found."), true, err.message);
});
