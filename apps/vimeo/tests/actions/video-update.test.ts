import { assert, assertEquals } from "@std/assert";
import videoUpdate from "../../actions/video-update.ts";
import { jsonBody, mockCtx, q, url, video } from "../_helpers.ts";

Deno.test("video-update: PATCHes /videos/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: video(1) }]);
  await videoUpdate.execute({ videoId: "/videos/1", name: "New title" }, ctx);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(url(calls[0]).pathname, "/videos/1");
  assertEquals(jsonBody(calls[0]), { name: "New title" });
});

/**
 * The reference documents the body in dot notation but the wire format is
 * nested JSON. Sending the literal key `"privacy.view"` is a different request
 * Vimeo will not apply — this is the assertion that pins the translation.
 */
Deno.test("video-update: privacy fields are nested, not sent as dotted keys", async () => {
  const { ctx, calls } = mockCtx([{ body: video(1) }]);
  await videoUpdate.execute({
    videoId: "1",
    privacyView: "password",
    password: "hunter1",
    privacyEmbed: "whitelist",
    privacyDownload: false,
    privacyComments: "nobody",
    privacyAdd: true,
    embedColor: "#1ab7ea",
  }, ctx);
  const body = jsonBody(calls[0]);
  assertEquals(body, {
    privacy: {
      view: "password",
      embed: "whitelist",
      download: false,
      comments: "nobody",
      add: true,
    },
    embed: { color: "#1ab7ea" },
    password: "hunter1",
  });
  assert(!calls[0].body!.includes('"privacy.view"'), "sent the dotted key literally");
});

/** Only the fields present are applied, so an unset param must not appear. */
Deno.test("video-update: unset params are absent from the body", async () => {
  const { ctx, calls } = mockCtx([{ body: video(1) }]);
  await videoUpdate.execute({ videoId: "1", name: "Just the title" }, ctx);
  assertEquals(Object.keys(jsonBody(calls[0])), ["name"]);
});

Deno.test("video-update: an unset privacy leaf never creates an empty privacy object", async () => {
  const { ctx, calls } = mockCtx([{ body: video(1) }]);
  await videoUpdate.execute({ videoId: "1", description: "x" }, ctx);
  assertEquals(jsonBody(calls[0]).privacy, undefined);
});

/** `embed_domains: []` clears the allowlist; a blank param must never become one. */
Deno.test("video-update: a blank embed allowlist is omitted, not sent as an empty array", async () => {
  const { ctx, calls } = mockCtx([{ body: video(1) }, { body: video(1) }]);
  await videoUpdate.execute({ videoId: "1", embedDomains: "" }, ctx);
  assertEquals(jsonBody(calls[0]).embed_domains, undefined);

  await videoUpdate.execute({
    videoId: "1",
    embedDomains: "example.com, partner.example",
    embedDomainsAdd: "added.example",
    embedDomainsDelete: "gone.example",
  }, ctx);
  const body = jsonBody(calls[1]);
  assertEquals(body.embed_domains, ["example.com", "partner.example"]);
  assertEquals(body.embed_domains_add, ["added.example"]);
  assertEquals(body.embed_domains_delete, ["gone.example"]);
});

Deno.test("video-update: fields goes on the query, never in the body", async () => {
  const { ctx, calls } = mockCtx([{ body: video(1) }]);
  await videoUpdate.execute({ videoId: "1", name: "x", fields: "uri,name" }, ctx);
  assertEquals(q(calls[0], "fields"), "uri,name");
  assertEquals(jsonBody(calls[0]).fields, undefined);
});

Deno.test("video-update: the password param is a masked secret", () => {
  const password = (videoUpdate.params ?? []).find((p) => p.key === "password");
  assertEquals(password?.type, "secret");
});

Deno.test("video-update: is a convergent perform", () => {
  assertEquals(videoUpdate.type, "perform");
  assertEquals(videoUpdate.idempotent, true);
});
