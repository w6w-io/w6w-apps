import type { Param } from "@w6w/types";

/**
 * The site a call is addressed to is a path segment, so unlike a header-borne
 * credential it has to be visible to actions. It is collected once at connect
 * time and published to `connection.display`; this param is the per-call
 * override, because one OAuth grant commonly reaches several verified sites.
 * Same shape as `propertyId` in this pack's `google-analytics` app.
 */
export const SITE_URL_PARAM: Param = {
  key: "siteUrl",
  label: "Site URL",
  type: "string",
  default: "",
  placeholder: "https://www.example.com/ or sc-domain:example.com",
  hint: "Leave blank to use the site on the connection. A URL-prefix property (protocol and " +
    "trailing slash both significant) or a domain property (`sc-domain:` prefix).",
};

/** `webmasters/v3` addresses a sitemap by its own URL, one path segment past the site. */
export const FEEDPATH_PARAM: Param = {
  key: "feedpath",
  label: "Sitemap URL",
  type: "string",
  required: true,
  placeholder: "https://www.example.com/sitemap.xml",
  hint: "The exact URL of the sitemap, as submitted.",
};
