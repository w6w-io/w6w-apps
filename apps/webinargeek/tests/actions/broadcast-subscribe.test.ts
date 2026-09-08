import { assertEquals } from "@std/assert";
import broadcastSubscribe from "../../actions/broadcast-subscribe.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("broadcast-subscribe: POSTs to /broadcasts/{id}/subscriptions with a translated body", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: 1, watch_link: "https://x" } }]);
  const out = await broadcastSubscribe.execute({
    broadcastId: 12,
    firstname: "John",
    email: "john@smith.com",
    extraFields: { extra_field_3: "Yes" },
  }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v2/broadcasts/12/subscriptions");
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.email, "john@smith.com");
  assertEquals(body.extra_fields, { extra_field_3: "Yes" });
  assertEquals(out, { id: 1, watch_link: "https://x" });
});

Deno.test("broadcast-subscribe: is declared non-idempotent (no documented silent-skip)", () => {
  assertEquals(broadcastSubscribe.idempotent, false);
});
