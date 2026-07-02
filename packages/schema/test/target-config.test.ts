import { test, expect } from "vitest";
import { parseRedTeamConfig } from "../src/target-config.js";

test("parseRedTeamConfig fills in defaults for method, headers, timeout, run", () => {
  const config = parseRedTeamConfig({
    target: { url: "http://localhost:4001/chat", responsePath: "reply" },
    library: "../attacks/attack_library.json",
  });
  expect(config.target.method).toBe("POST");
  expect(config.target.timeoutMs).toBe(10000);
  expect(config.run.concurrency).toBe(4);
  expect(config.run.delaySeconds).toBe(0);
});

test("parseRedTeamConfig rejects a config missing target.url", () => {
  expect(() =>
    parseRedTeamConfig({ target: { responsePath: "reply" }, library: "x" }),
  ).toThrow(/Config error/);
});
