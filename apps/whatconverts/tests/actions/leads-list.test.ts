import { assertEquals } from "@std/assert";
import leadsList from "../../actions/leads-list.ts";
import { mockCtx, queryOf } from "../_helpers.ts";

Deno.test("leads-list defaults leads_per_page to 25 and drops unset filters", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { page_number: 1, leads_per_page: 25, total_pages: 1, total_leads: 0, leads: [] },
  }]);
  const out = await leadsList.execute({}, ctx);
  assertEquals(out, {
    page_number: 1,
    leads_per_page: 25,
    total_pages: 1,
    total_leads: 0,
    leads: [],
  });
  assertEquals(queryOf(calls[0].url), { leads_per_page: "25" });
});

Deno.test("leads-list forwards every filter as documented query params", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { leads: [] } }]);
  await leadsList.execute({
    leadsPerPage: 100,
    pageNumber: 2,
    accountId: 111,
    profileId: 222,
    leadType: "phone_call",
    leadStatus: "unique",
    startDate: "2015-11-10",
    endDate: "2015-12-20",
    order: "asc",
    quotable: "yes",
    quoteValue: "has_value",
    salesValue: "no_value",
    phoneNumber: "+17044695324",
    emailAddress: "a@b.com",
    userId: "user-1",
    spam: true,
    duplicate: false,
    leadSource: "google",
    leadMedium: "cpc",
    leadCampaign: "camp",
    leadContent: "content",
    leadKeyword: "keyword",
    customerJourney: true,
  }, ctx);
  assertEquals(queryOf(calls[0].url), {
    leads_per_page: "100",
    page_number: "2",
    account_id: "111",
    profile_id: "222",
    lead_type: "phone_call",
    lead_status: "unique",
    start_date: "2015-11-10",
    end_date: "2015-12-20",
    order: "asc",
    quotable: "yes",
    quote_value: "has_value",
    sales_value: "no_value",
    phone_number: "+17044695324",
    email_address: "a@b.com",
    user_id: "user-1",
    spam: "true",
    duplicate: "false",
    lead_source: "google",
    lead_medium: "cpc",
    lead_campaign: "camp",
    lead_content: "content",
    lead_keyword: "keyword",
    customer_journey: "true",
  });
});
