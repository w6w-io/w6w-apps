import { assertEquals } from "@std/assert";
import { mockWorkableCtx } from "../_helpers.ts";
import action from "../../actions/candidate-list.ts";

Deno.test("candidate-list: GETs /candidates account-wide when no filter is given", async () => {
  const { ctx, calls } = mockWorkableCtx([{ body: { candidates: [] } }]);
  await action.execute({}, ctx);
  assertEquals(calls[0].url, "https://acme.workable.com/spi/v3/candidates");
});

Deno.test("candidate-list: narrows by job shortcode and stage", async () => {
  const { ctx, calls } = mockWorkableCtx([{ body: { candidates: [{ id: "c1" }] } }]);
  const out = await action.execute({ shortcode: "GROOV005", stage: "applied" }, ctx);
  assertEquals(
    calls[0].url,
    "https://acme.workable.com/spi/v3/candidates?shortcode=GROOV005&stage=applied",
  );
  assertEquals(out, { candidates: [{ id: "c1" }], nextUrl: undefined });
});

Deno.test("candidate-list: pageUrl bypasses every other filter", async () => {
  const { ctx, calls } = mockWorkableCtx([{ body: { candidates: [] } }]);
  const nextUrl = "https://acme.workable.com/spi/v3/candidates?since_id=abc";
  await action.execute({ pageUrl: nextUrl, email: "ignored@example.com" }, ctx);
  assertEquals(calls[0].url, nextUrl);
});
