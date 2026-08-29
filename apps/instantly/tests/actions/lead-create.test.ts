import { assertEquals } from "@std/assert";
import leadCreate from "../../actions/lead-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("lead-create: POSTs /leads with the profile fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "l1", email: "a@b.com" } }]);
  const out = await leadCreate.execute(
    { campaign: "c1", email: "a@b.com", first_name: "Jon" },
    ctx,
  ) as { id: string };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v2/leads");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.campaign, "c1");
  assertEquals(body.email, "a@b.com");
  assertEquals(body.first_name, "Jon");
  assertEquals(out.id, "l1");
});

Deno.test("lead-create: custom_variables accepts a JSON string", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await leadCreate.execute(
    { campaign: "c1", email: "a@b.com", custom_variables: '{"past_customer":true}' },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).custom_variables, { past_customer: true });
});

Deno.test("lead-create: is declared non-idempotent", () => {
  assertEquals(leadCreate.idempotent, false);
});
