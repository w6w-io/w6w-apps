import { assertEquals } from "@std/assert";
import linkedinOrganizationResolve from "../../actions/linkedin-organization-resolve.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("linkedin-organization-resolve: resolves a company URL into mention data", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      id: "86779668",
      urn: "urn:li:organization:86779668",
      mention_text: "@[Typefully](urn:li:organization:86779668)",
      name: "Typefully",
    },
  }]);
  const out = await linkedinOrganizationResolve.execute({
    socialSetId: 4,
    organizationUrl: "https://www.linkedin.com/company/typefullycom",
  }, ctx) as { mention_text: string };

  assertEquals(pathOf(calls[0].url), "/v2/social-sets/4/linkedin/organizations/resolve");
  assertEquals(
    queryOf(calls[0].url).organization_url,
    "https://www.linkedin.com/company/typefullycom",
  );
  assertEquals(out.mention_text, "@[Typefully](urn:li:organization:86779668)");
});
