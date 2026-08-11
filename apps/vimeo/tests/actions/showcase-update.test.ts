import { assert, assertEquals } from "@std/assert";
import showcaseUpdate from "../../actions/showcase-update.ts";
import { jsonBody, mockCtx, q, url } from "../_helpers.ts";

const showcase = { uri: "/users/152184/albums/3706071", name: "Renamed" };

Deno.test("showcase-update: PATCHes /me/albums/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: showcase }]);
  await showcaseUpdate.execute({ showcaseId: "/showcases/3706071", name: "Renamed" }, ctx);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(url(calls[0]).pathname, "/me/albums/3706071");
  assertEquals(jsonBody(calls[0]), { name: "Renamed" });
});

/** Unlike create, `name` is optional on edit — only present fields are applied. */
Deno.test("showcase-update: name is optional and unset params are absent", async () => {
  const name = (showcaseUpdate.params ?? []).find((p) => p.key === "name");
  assertEquals(name?.required, undefined);
  const { ctx, calls } = mockCtx([{ body: showcase }]);
  await showcaseUpdate.execute({ showcaseId: "1", theme: "dark" }, ctx);
  assertEquals(jsonBody(calls[0]), { theme: "dark" });
});

/** The three edit-only fields, and the create-only one that must not be here. */
Deno.test("showcase-update: carries the edit-only custom URL and domain fields", async () => {
  const { ctx, calls } = mockCtx([{ body: showcase }]);
  await showcaseUpdate.execute({
    showcaseId: "1",
    url: "my-custom-url",
    domain: "mycustomdomain.com",
    useCustomDomain: true,
  }, ctx);
  assertEquals(jsonBody(calls[0]), {
    url: "my-custom-url",
    domain: "mycustomdomain.com",
    use_custom_domain: true,
  });
  const keys = (showcaseUpdate.params ?? []).map((p) => p.key);
  assert(!keys.includes("hideFromVimeo"), "hide_from_vimeo is documented on create only");
});

Deno.test("showcase-update: fields goes on the query", async () => {
  const { ctx, calls } = mockCtx([{ body: showcase }]);
  await showcaseUpdate.execute({ showcaseId: "1", name: "x", fields: "uri" }, ctx);
  assertEquals(q(calls[0], "fields"), "uri");
});

Deno.test("showcase-update: is a convergent perform", () => {
  assertEquals(showcaseUpdate.type, "perform");
  assertEquals(showcaseUpdate.idempotent, true);
});
