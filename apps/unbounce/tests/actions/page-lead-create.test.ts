import { assertEquals } from "@std/assert";
import pageLeadCreate from "../../actions/page-lead-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("page-lead-create: posts a form_submission with the vendor's shape", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "lead-1" } }]);
  await pageLeadCreate.execute(
    {
      pageId: "p1",
      variantId: "a",
      submitterIp: "127.0.0.1",
      formData: { email: "jqdoe@unbounce.com" },
      conversion: true,
    },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/pages/p1/leads");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    conversion: true,
    form_submission: {
      variant_id: "a",
      submitter_ip: "127.0.0.1",
      form_data: { email: "jqdoe@unbounce.com" },
    },
  });
});

Deno.test("page-lead-create: omits optional fields the caller left unset", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "lead-1" } }]);
  await pageLeadCreate.execute(
    { pageId: "p1", variantId: "a", submitterIp: "127.0.0.1", formData: {} },
    ctx,
  );

  const body = JSON.parse(calls[0].body!);
  assertEquals("conversion" in body, false);
  assertEquals("visitor_id" in body, false);
});
