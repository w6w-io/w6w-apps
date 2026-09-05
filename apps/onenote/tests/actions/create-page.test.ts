import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-page.ts";

const HTML =
  "<!DOCTYPE html><html><head><title>My page</title></head><body><p>hi</p></body></html>";

Deno.test("create-page: posts to a specific section's pages collection", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "p1", title: "My page" } }]);
  await action.execute({ sectionId: "sec1", content: HTML }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/me/onenote/sections/sec1/pages");
  assertEquals(calls[0].method, "POST");
});

Deno.test("create-page: no Section ID posts to the flat, default-notebook endpoint", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "p1" } }]);
  await action.execute({ content: HTML }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/me/onenote/pages");
});

Deno.test("create-page: Section name only applies to the flat form", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "p1" } }]);
  await action.execute({ sectionName: "My section", content: HTML }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("sectionName"), "My section");
});

Deno.test("create-page: Section name is dropped when Section ID is set — no ambiguity about which wins", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "p1" } }]);
  await action.execute({ sectionId: "sec1", sectionName: "ignored", content: HTML }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.has("sectionName"), false);
});

Deno.test("create-page: the body IS the HTML, not a JSON envelope", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "p1" } }]);
  await action.execute({ content: HTML }, ctx);
  assertEquals(calls[0].body, HTML);
  assertEquals(calls[0].headers["content-type"], "text/html");
});

Deno.test("create-page: Content type is overridable to application/xhtml+xml", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "p1" } }]);
  await action.execute({ content: HTML, contentType: "application/xhtml+xml" }, ctx);
  assertEquals(calls[0].headers["content-type"], "application/xhtml+xml");
});

Deno.test("create-page: mints a new resource each call — not idempotent", () => {
  assertEquals(action.idempotent, false);
});
