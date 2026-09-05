import { assertEquals } from "@std/assert";
import { mockWorkableCtx } from "../_helpers.ts";
import action from "../../actions/job-list.ts";

Deno.test("job-list: GETs /jobs with compacted query params", async () => {
  const { ctx, calls } = mockWorkableCtx([{ body: { jobs: [{ id: "1" }] } }]);
  const out = await action.execute({ state: "published", limit: 10 }, ctx);
  assertEquals(calls[0].url, "https://acme.workable.com/spi/v3/jobs?state=published&limit=10");
  assertEquals(calls[0].method, "GET");
  assertEquals(out, { jobs: [{ id: "1" }], nextUrl: undefined });
});

Deno.test("job-list: omits unset filters entirely rather than sending empty query params", async () => {
  const { ctx, calls } = mockWorkableCtx([{ body: { jobs: [] } }]);
  await action.execute({}, ctx);
  assertEquals(calls[0].url, "https://acme.workable.com/spi/v3/jobs");
});

Deno.test("job-list: follows paging.next verbatim when pageUrl is supplied", async () => {
  const { ctx, calls } = mockWorkableCtx([{ body: { jobs: [{ id: "2" }] } }]);
  const nextUrl = "https://acme.workable.com/spi/v3/jobs?since_id=abc&limit=50";
  const out = await action.execute({ pageUrl: nextUrl }, ctx);
  assertEquals(calls[0].url, nextUrl);
  assertEquals(out, { jobs: [{ id: "2" }], nextUrl: undefined });
});

Deno.test("job-list: surfaces paging.next from the response body for the next call", async () => {
  const { ctx } = mockWorkableCtx([{
    body: { jobs: [], paging: { next: "https://acme.workable.com/spi/v3/jobs?since_id=z" } },
  }]);
  const out = await action.execute({}, ctx);
  assertEquals(out, { jobs: [], nextUrl: "https://acme.workable.com/spi/v3/jobs?since_id=z" });
});
