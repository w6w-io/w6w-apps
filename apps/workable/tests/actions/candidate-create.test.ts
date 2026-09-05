import { assertEquals } from "@std/assert";
import { mockWorkableCtx } from "../_helpers.ts";
import action from "../../actions/candidate-create.ts";

Deno.test("candidate-create: POSTs /jobs/:shortcode/candidates with the sourced+candidate envelope", async () => {
  const { ctx, calls } = mockWorkableCtx([{ status: 201, body: { status: "created" } }]);
  await action.execute({
    shortcode: "GROOV005",
    email: "jane@example.com",
    name: "Jane Doe",
  }, ctx);
  assertEquals(calls[0].url, "https://acme.workable.com/spi/v3/jobs/GROOV005/candidates");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    sourced: true,
    candidate: { name: "Jane Doe", email: "jane@example.com" },
  });
});

Deno.test("candidate-create: sourced defaults to true (Workable's own documented default)", async () => {
  const { ctx, calls } = mockWorkableCtx([{ body: {} }]);
  await action.execute({ shortcode: "J", email: "a@b.com" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).sourced, true);
});

Deno.test("candidate-create: sourced: false is honored, not treated as unset", async () => {
  const { ctx, calls } = mockWorkableCtx([{ body: {} }]);
  await action.execute({ shortcode: "J", email: "a@b.com", sourced: false }, ctx);
  assertEquals(JSON.parse(calls[0].body!).sourced, false);
});

Deno.test("candidate-create: the stage override travels as a query param, not in the body", async () => {
  const { ctx, calls } = mockWorkableCtx([{ body: {} }]);
  await action.execute({ shortcode: "J", email: "a@b.com", stage: "phone-screen" }, ctx);
  assertEquals(
    calls[0].url,
    "https://acme.workable.com/spi/v3/jobs/J/candidates?stage=phone-screen",
  );
  assertEquals("stage" in JSON.parse(calls[0].body!), false);
});
