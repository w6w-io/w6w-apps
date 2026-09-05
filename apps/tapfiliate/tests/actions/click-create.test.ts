import { assertEquals } from "@std/assert";
import clickCreate from "../../actions/click-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("click-create: posts referral_code and optional tracking fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "ab885a1c-8ad9-11ea-bc55-0242ac130003" } }]);
  const out = await clickCreate.execute(
    {
      referralCode: "nwjinmy",
      sourceId: "aaaaaa",
      referrer: "https://example.com",
      landingPage: "https://tapper.inc",
    },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/1.6/clicks/");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    referral_code: "nwjinmy",
    source_id: "aaaaaa",
    referrer: "https://example.com",
    landing_page: "https://tapper.inc",
  });
  assertEquals(out, { id: "ab885a1c-8ad9-11ea-bc55-0242ac130003" });
});
