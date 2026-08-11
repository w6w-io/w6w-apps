import { assert, assertEquals } from "@std/assert";
import {
  apiBase,
  DEFAULT_SITE_ID,
  siteById,
  siteFromConnection,
  siteOptions,
  SITES,
} from "../../lib/sites.ts";
import { mockCtx, mockCtxWithoutConnection } from "../_helpers.ts";

Deno.test("sites: the nine documented sites, each with its own api host", () => {
  assertEquals(SITES.length, 9);
  assertEquals(new Set(SITES.map((s) => s.id)).size, 9, "duplicate site id");
  assertEquals(new Set(SITES.map((s) => s.apiHost)).size, 9, "duplicate api host");
  for (const site of SITES) {
    assertEquals(site.apiHost, `api.${site.domain}`, `${site.id}: host does not follow the domain`);
  }
});

/** The exact domains in Datadog's own OpenAPI `site` enum, fetched 2026-08-11. */
Deno.test("sites: the domains match the vendor's server enum", () => {
  assertEquals(
    SITES.map((s) => s.domain),
    [
      "datadoghq.com",
      "us3.datadoghq.com",
      "us5.datadoghq.com",
      "datadoghq.eu",
      "ap1.datadoghq.com",
      "ap2.datadoghq.com",
      "uk1.datadoghq.com",
      "ddog-gov.com",
      "us2.ddog-gov.com",
    ],
  );
});

Deno.test("sites: apiBase builds an https origin with no trailing slash", () => {
  assertEquals(apiBase(siteById("us1")!), "https://api.datadoghq.com");
  assertEquals(apiBase(siteById("eu1")!), "https://api.datadoghq.eu");
  assertEquals(apiBase(siteById("gov")!), "https://api.ddog-gov.com");
});

/**
 * `DD_SITE` holds the domain, so that is what people paste. Accepting it costs
 * nothing and turns a plausible mistake into a working connection.
 */
Deno.test("sites: a site resolves by id or by the raw domain", () => {
  assertEquals(siteById("eu1")?.id, "eu1");
  assertEquals(siteById("datadoghq.eu")?.id, "eu1");
  assertEquals(siteById("  US3  ")?.id, "us3");
  assertEquals(siteById("us9.datadoghq.com"), undefined);
  assertEquals(siteById(undefined), undefined);
});

Deno.test("sites: the connection's display.site chooses the origin", () => {
  const { ctx } = mockCtx([], "eu1");
  assertEquals(siteFromConnection(ctx.connection).apiHost, "api.datadoghq.eu");
});

Deno.test("sites: a connection with no site falls back to the vendor default", () => {
  const { ctx } = mockCtxWithoutConnection();
  assertEquals(siteFromConnection(ctx.connection).id, DEFAULT_SITE_ID);
  assertEquals(DEFAULT_SITE_ID, "us1");
});

Deno.test("sites: an unrecognised site on a connection falls back rather than throwing", () => {
  const { ctx } = mockCtx([], "atlantis");
  assertEquals(siteFromConnection(ctx.connection).id, "us1");
});

Deno.test("sites: the select options cover every site", () => {
  assertEquals(siteOptions.length, SITES.length);
  for (const option of siteOptions) {
    assert(siteById(String(option.value)), `option ${option.value} is not a site`);
    assert(option.label.length > 0);
  }
});
