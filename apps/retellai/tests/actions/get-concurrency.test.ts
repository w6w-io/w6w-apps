import { assertEquals } from "@std/assert";
import getConcurrency from "../../actions/get-concurrency.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("get-concurrency: GETs /get-concurrency and returns the figures verbatim", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      current_concurrency: 10,
      concurrency_limit: 100,
      base_concurrency: 20,
      purchased_concurrency: 80,
      concurrency_burst_enabled: true,
      concurrency_burst_limit: 60,
    },
  }]);

  const out = await getConcurrency.execute({}, ctx);

  assertEquals(pathOf(calls[0].url), "/get-concurrency");
  assertEquals(out.current_concurrency, 10);
  assertEquals(out.concurrency_limit, 100);
  assertEquals(out.concurrency_burst_limit, 60);
});
