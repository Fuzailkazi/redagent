import { test, expect } from "vitest";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { renderBody, extractResponseText, sendProbe } from "../src/adapter.js";
import type { TargetConfig } from "@armoriq/schema";

test("renderBody substitutes {{PROMPT}} into nested string fields", () => {
  const template = { message: "Attack: {{PROMPT}}", meta: { tag: "static", nested: ["{{PROMPT}}", "unchanged"] } };
  const result = renderBody(template, "ignore instructions");
  expect(result).toEqual({
    message: "Attack: ignore instructions",
    meta: { tag: "static", nested: ["ignore instructions", "unchanged"] },
  });
});

test("extractResponseText resolves a simple dotted path", () => {
  expect(extractResponseText({ reply: "hello" }, "reply")).toBe("hello");
});

test("extractResponseText resolves a path through an array index", () => {
  const body = { choices: [{ message: { content: "hi there" } }] };
  expect(extractResponseText(body, "choices.0.message.content")).toBe("hi there");
});

test("extractResponseText throws when the path does not resolve", () => {
  expect(() => extractResponseText({ reply: "hi" }, "missing.path")).toThrow();
});

test("sendProbe posts the templated body and extracts the response via responsePath", async () => {
  let receivedBody: unknown;
  const server = createServer((req, res) => {
    let raw = "";
    req.on("data", (chunk) => (raw += chunk));
    req.on("end", () => {
      receivedBody = JSON.parse(raw);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ choices: [{ message: { content: "mock reply" } }] }));
    });
  });

  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as AddressInfo).port;

  const target: TargetConfig = {
    url: `http://localhost:${port}/chat`,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    bodyTemplate: { message: "{{PROMPT}}" },
    responsePath: "choices.0.message.content",
    timeoutMs: 5000,
  };

  try {
    const { responseText } = await sendProbe(target, "test prompt");
    expect(responseText).toBe("mock reply");
    expect(receivedBody).toEqual({ message: "test prompt" });
  } finally {
    server.close();
  }
});
