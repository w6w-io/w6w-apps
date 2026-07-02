import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-senders.ts";

Deno.test("list-senders: GETs /v3/senders and returns the envelope", async () => {
  const body = { senders: [{ id: 1, name: "Ada" }] };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v3/senders");
  assertEquals(result, body);
});

Deno.test("list-senders: forwards ip and domain filters as query params", async () => {
  const { ctx, calls } = mockCtx([{ body: { senders: [] } }]);
  await action.execute!({ ip: "1.2.3.4", domain: "x.com" }, ctx);
  const params = new URL(calls[0].url).searchParams;
  assertEquals(params.get("ip"), "1.2.3.4");
  assertEquals(params.get("domain"), "x.com");
});

Deno.test("list-senders: omits filters when not provided", async () => {
  const { ctx, calls } = mockCtx([{ body: { senders: [] } }]);
  await action.execute!({}, ctx);
  const params = new URL(calls[0].url).searchParams;
  assert(!params.has("ip"));
  assert(!params.has("domain"));
});

Deno.test("list-senders: applies limit client-side when provided", async () => {
  const body = { senders: [{ id: 1 }, { id: 2 }, { id: 3 }] };
  const { ctx } = mockCtx([{ body }]);
  const result = await action.execute!({ limit: 2 }, ctx) as { senders: unknown[] };
  assertEquals(result.senders.length, 2);
});
