import { assertEquals } from "@std/assert";
import action from "../../actions/business-unit-get-web-links.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("business-unit-get-web-links: sends the required locale and returns the links", async () => {
  const { ctx, calls } = mockCtx([
    {
      status: 200,
      body: {
        locale: "da-DK",
        profileUrl: "http://www.trustpilot.dk/review/www.trustpilot.com",
        evaluateUrl: "http://www.trustpilot.dk/evaluate/www.trustpilot.com",
        evaluateEmbedUrl: "http://www.trustpilot.dk/evaluate/embed/www.trustpilot.com",
      },
    },
  ]);

  const out = await action.execute({ businessUnitId: "bu1", locale: "da-DK" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/business-units/bu1/web-links");
  assertEquals(queryOf(calls[0].url).locale, "da-DK");
  assertEquals(out.evaluateUrl, "http://www.trustpilot.dk/evaluate/www.trustpilot.com");
});
