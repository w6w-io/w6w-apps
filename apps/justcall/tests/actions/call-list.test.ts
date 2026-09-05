import { assertEquals } from "@std/assert";
import callList from "../../actions/call-list.ts";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("call-list: hits GET /v2.1/calls and returns the raw envelope", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([{ id: 1 }]) }]);
  const out = await callList.execute({}, ctx) as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/v2.1/calls");
  assertEquals(out.data, [{ id: 1 }]);
});

Deno.test("call-list: array filters are comma-joined, per the vendor's own note", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([]) }]);
  await callList.execute(
    { call_traits: ["IVR", "MERGE"], disposition_codes: ["Sales: Lead"] },
    ctx,
  );

  assertEquals(queryOf(calls[0].url).call_traits, "IVR,MERGE");
  assertEquals(queryOf(calls[0].url).disposition_codes, "Sales: Lead");
});

Deno.test("call-list: unset filters are omitted rather than sent empty", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([]) }]);
  await callList.execute({}, ctx);

  assertEquals(queryOf(calls[0].url), {});
});

Deno.test("call-list: fetch_ai_data=false is still sent, not dropped like an unset filter", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([]) }]);
  await callList.execute({ fetch_ai_data: false }, ctx);

  assertEquals(queryOf(calls[0].url).fetch_ai_data, "false");
});
