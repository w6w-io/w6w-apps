import { assert, assertEquals } from "@std/assert";
import showcaseCreate from "../../actions/showcase-create.ts";
import { jsonBody, mockCtx, q, url } from "../_helpers.ts";

const showcase = { uri: "/users/152184/albums/3706071", name: "Holiday Videos" };

Deno.test("showcase-create: POSTs /me/albums with just the name", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: showcase }]);
  await showcaseCreate.execute({ name: "Holiday Videos" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(url(calls[0]).pathname, "/me/albums");
  assertEquals(jsonBody(calls[0]), { name: "Holiday Videos" });
});

/** A showcase's privacy is a FLAT body field, unlike a video's nested privacy.view. */
Deno.test("showcase-create: privacy is a flat field, not nested", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: showcase }]);
  await showcaseCreate.execute({ name: "x", privacy: "password", password: "hunter1" }, ctx);
  const body = jsonBody(calls[0]);
  assertEquals(body.privacy, "password");
  assertEquals(body.password, "hunter1");
});

Deno.test("showcase-create: forwards every documented appearance field", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: showcase }]);
  await showcaseCreate.execute({
    name: "x",
    description: "d",
    layout: "player",
    theme: "dark",
    sort: "arranged",
    brandColor: "ff66ee",
    hideNav: true,
    hideUpcoming: false,
    hideFromVimeo: true,
    reviewMode: true,
  }, ctx);
  assertEquals(jsonBody(calls[0]), {
    name: "x",
    description: "d",
    layout: "player",
    theme: "dark",
    sort: "arranged",
    brand_color: "ff66ee",
    hide_nav: true,
    hide_upcoming: false,
    hide_from_vimeo: true,
    review_mode: true,
  });
});

/** The showcase privacy vocabulary is its own — reusing a video's would offer rejected values. */
Deno.test("showcase-create: offers only the documented showcase privacy values", () => {
  const privacy = (showcaseCreate.params ?? []).find((p) => p.key === "privacy");
  const values = (privacy?.options as Array<{ value: string }>).map((o) => o.value).sort();
  assertEquals(values, ["anybody", "embed_only", "nobody", "password", "team", "unlisted"]);
  assert(!values.includes("disable"), "offered a video-only privacy value");
});

Deno.test("showcase-create: fields goes on the query", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: showcase }]);
  await showcaseCreate.execute({ name: "x", fields: "uri,name" }, ctx);
  assertEquals(q(calls[0], "fields"), "uri,name");
});

Deno.test("showcase-create: is explicitly not idempotent", () => {
  assertEquals(showcaseCreate.type, "perform");
  assertEquals(showcaseCreate.idempotent, false);
});
