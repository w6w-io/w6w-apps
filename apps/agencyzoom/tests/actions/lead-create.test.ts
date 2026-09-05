import { assertEquals } from "@std/assert";
import leadCreate from "../../actions/lead-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const REQUIRED = {
  firstname: "Alex",
  email: "alex@example.com",
  leadSourceId: 10,
  assignTo: 5,
  country: "US",
  pipelineId: 1,
  stageId: 2,
};

Deno.test("lead-create: POSTs required fields to /leads/create", async () => {
  const { ctx, calls } = mockCtx([{ body: { message: "ok", id: 99, result: true } }]);
  const result = await leadCreate.execute(REQUIRED, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/api/leads/create");
  assertEquals(JSON.parse(calls[0].body!), REQUIRED);
  assertEquals(result, { message: "ok", id: 99, result: true });
});

Deno.test("lead-create: optional fields left unset are omitted, not sent as null", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await leadCreate.execute(REQUIRED, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals("lastname" in body, false);
  assertEquals("notes" in body, false);
});

Deno.test("lead-create: is declared non-idempotent", () => {
  assertEquals(leadCreate.idempotent, false);
});
