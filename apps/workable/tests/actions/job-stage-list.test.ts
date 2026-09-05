import { assertEquals } from "@std/assert";
import { mockWorkableCtx } from "../_helpers.ts";
import action from "../../actions/job-stage-list.ts";

Deno.test("job-stage-list: GETs /jobs/:shortcode/stages and unwraps the envelope", async () => {
  const { ctx, calls } = mockWorkableCtx([{
    body: { stages: [{ slug: "sourced", name: "Sourced" }] },
  }]);
  const out = await action.execute({ shortcode: "GROOV003" }, ctx);
  assertEquals(calls[0].url, "https://acme.workable.com/spi/v3/jobs/GROOV003/stages");
  assertEquals(out, { stages: [{ slug: "sourced", name: "Sourced" }] });
});

Deno.test("job-stage-list: defaults to an empty array rather than undefined", async () => {
  const { ctx } = mockWorkableCtx([{ status: 200, body: {} }]);
  const out = await action.execute({ shortcode: "X" }, ctx);
  assertEquals(out, { stages: [] });
});
