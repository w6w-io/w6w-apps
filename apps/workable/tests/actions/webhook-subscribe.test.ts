import { assertEquals } from "@std/assert";
import { mockWorkableCtx } from "../_helpers.ts";
import action from "../../actions/webhook-subscribe.ts";

Deno.test("webhook-subscribe: an employee event omits args entirely", async () => {
  const { ctx, calls } = mockWorkableCtx([{ status: 201, body: { id: 42 } }]);
  const out = await action.execute({
    target: "https://example.com/hook",
    event: "employee_created",
  }, ctx);
  assertEquals(calls[0].url, "https://acme.workable.com/spi/v3/subscriptions");
  assertEquals(JSON.parse(calls[0].body!), {
    target: "https://example.com/hook",
    event: "employee_created",
  });
  assertEquals(out, { id: 42 });
});

Deno.test("webhook-subscribe: an unfiltered candidate event also omits args", async () => {
  const { ctx, calls } = mockWorkableCtx([{ body: { id: 1 } }]);
  await action.execute({ target: "https://example.com/hook", event: "candidate_created" }, ctx);
  assertEquals("args" in JSON.parse(calls[0].body!), false);
});

Deno.test(
  "webhook-subscribe: filtering by job or stage sends ALL of args, with account_id from the connection",
  async () => {
    const { ctx, calls } = mockWorkableCtx([{ body: { id: 1 } }], "groove-tech");
    await action.execute({
      target: "https://example.com/hook",
      event: "candidate_moved",
      jobShortcode: "GROOV005",
    }, ctx);
    assertEquals(JSON.parse(calls[0].body!).args, {
      account_id: "groove-tech",
      job_shortcode: "GROOV005",
      stage_slug: "",
    });
  },
);

Deno.test("webhook-subscribe: filtering by stage alone still sends an empty job_shortcode", async () => {
  const { ctx, calls } = mockWorkableCtx([{ body: { id: 1 } }]);
  await action.execute({
    target: "https://example.com/hook",
    event: "candidate_moved",
    stageSlug: "hired",
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!).args, {
    account_id: "acme",
    job_shortcode: "",
    stage_slug: "hired",
  });
});
