import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-opportunity.ts";

Deno.test("create-opportunity: requires name, targetClose, probability, stage and amounts", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, false);
  const required = (action.params ?? []).filter((p) => p.required).map((p) => p.key);
  for (const k of ["name", "targetClose", "probability", "stage", "amounts"]) {
    assert(required.includes(k), `missing required param ${k}`);
  }
});

Deno.test("create-opportunity: POSTs /opportunities with the mapped body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 1 } }]);
  const amounts = [{ amount: 56.76, currency: "$", kind: "Fee" }];
  await action.execute({
    name: "Financial Plan",
    targetClose: "2025-11-12 11:00 AM -0500",
    probability: 70,
    stage: 1,
    amounts,
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v1/opportunities");
  assertEquals(JSON.parse(calls[0].body!), {
    name: "Financial Plan",
    target_close: "2025-11-12 11:00 AM -0500",
    probability: 70,
    stage: 1,
    amounts,
  });
});

Deno.test("create-opportunity: only uses the first linked contact per Wealthbox's documented limit", () => {
  const p = (action.params ?? []).find((p) => p.key === "linkedTo")!;
  assert(/first entry/i.test(p.hint ?? ""), "hint should say only the first entry is used");
});
