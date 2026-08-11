import { assert, assertEquals } from "@std/assert";
import userUpdate from "../../actions/user-update.ts";
import { jsonBody, mockCtx, q, url } from "../_helpers.ts";

const me = { uri: "/users/152184", name: "Test Account" };

Deno.test("user-update: PATCHes the /me alias", async () => {
  const { ctx, calls } = mockCtx([{ body: me }]);
  await userUpdate.execute({ name: "New name" }, ctx);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(url(calls[0]).pathname, "/me");
  assertEquals(jsonBody(calls[0]), { name: "New name" });
});

/** The user body nests under `videos.privacy.*`, not the video body's `privacy.*`. */
Deno.test("user-update: upload defaults nest under videos.privacy", async () => {
  const { ctx, calls } = mockCtx([{ body: me }]);
  await userUpdate.execute({
    videosPrivacyView: "unlisted",
    videosPrivacyEmbed: "whitelist",
    videosPrivacyDownload: false,
    videosPrivacyComments: "contacts",
    videosPrivacyAdd: true,
    embedAllowedDomains: "example.com, partner.example",
  }, ctx);
  assertEquals(jsonBody(calls[0]), {
    videos: {
      privacy: {
        view: "unlisted",
        embed: "whitelist",
        download: false,
        comments: "contacts",
        add: true,
        embed_allowed_domains: ["example.com", "partner.example"],
      },
    },
  });
});

Deno.test("user-update: profile fields stay at the top level", async () => {
  const { ctx, calls } = mockCtx([{ body: me }]);
  await userUpdate.execute({ name: "N", bio: "B", location: "L", link: "slug" }, ctx);
  assertEquals(jsonBody(calls[0]), { name: "N", bio: "B", location: "L", link: "slug" });
});

Deno.test("user-update: unset params are absent from the body", async () => {
  const { ctx, calls } = mockCtx([{ body: me }]);
  await userUpdate.execute({ bio: "only this" }, ctx);
  assertEquals(Object.keys(jsonBody(calls[0])), ["bio"]);
});

Deno.test("user-update: a blank embed allowlist is omitted, not sent as an empty array", async () => {
  const { ctx, calls } = mockCtx([{ body: me }]);
  await userUpdate.execute({ name: "x", embedAllowedDomains: "" }, ctx);
  assertEquals(jsonBody(calls[0]).videos, undefined);
});

/**
 * The account-wide default video password is deliberately not exposed: it is an
 * account-wide secret with an awkward joint requirement, and setting one for
 * every future upload from a workflow is not worth making easy.
 */
Deno.test("user-update: offers no password param", () => {
  const keys = (userUpdate.params ?? []).map((p) => p.key);
  assert(!keys.some((k) => /password/i.test(k)), "user-update exposed a password param");
});

Deno.test("user-update: fields goes on the query", async () => {
  const { ctx, calls } = mockCtx([{ body: me }]);
  await userUpdate.execute({ name: "x", fields: "uri,name" }, ctx);
  assertEquals(q(calls[0], "fields"), "uri,name");
});

Deno.test("user-update: is a convergent perform", () => {
  assertEquals(userUpdate.type, "perform");
  assertEquals(userUpdate.idempotent, true);
});
