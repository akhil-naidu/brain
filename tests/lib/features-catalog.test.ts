import { describe, expect, it } from "vitest";
import { SITE_LICENSE_HREF } from "@/lib/seo/site";
import {
  HOME_ARCHITECTURE_PLANES,
  HOME_CAPABILITIES,
  HOME_CHAT_DEMO_TURNS,
  HOME_CONNECTION_APPS,
  HOME_FOOTER_GROUPS,
  HOME_TOUR_SCENES,
} from "@/lib/features/catalog";

describe("HOME_CONNECTION_APPS", () => {
  it("lists every shipped MCP app on the home row", () => {
    expect(HOME_CONNECTION_APPS.map((app) => app.id)).toEqual([
      "clickup",
      "slack",
      "asana",
      "gmail",
      "notion",
      "linear",
      "atlassian",
      "zernio",
      "sentry",
      "dflow",
      "github",
      "snowflake",
      "mongodb",
      "toolbox",
    ]);
    for (const app of HOME_CONNECTION_APPS) {
      expect(app.label.trim().length).toBeGreaterThan(0);
    }
  });
});

describe("HOME_ARCHITECTURE_PLANES", () => {
  it("covers the three home architecture planes", () => {
    expect(HOME_ARCHITECTURE_PLANES.map((plane) => plane.id)).toEqual(["data", "models", "tools"]);
    for (const plane of HOME_ARCHITECTURE_PLANES) {
      expect(plane.title.trim().length).toBeGreaterThan(0);
      expect(plane.body.trim().length).toBeGreaterThan(20);
    }
  });
});

describe("HOME_TOUR_SCENES", () => {
  it("covers the home product tour beats", () => {
    expect(HOME_TOUR_SCENES.map((scene) => scene.id)).toEqual([
      "chat",
      "connections",
      "models",
      "runtime",
    ]);
    for (const scene of HOME_TOUR_SCENES) {
      expect(scene.title.trim().length).toBeGreaterThan(0);
      expect(scene.summary.trim().length).toBeGreaterThan(20);
      expect(scene.points.length).toBeGreaterThanOrEqual(2);
      for (const point of scene.points) {
        expect(point.trim().length).toBeGreaterThan(8);
      }
    }
  });
});

describe("HOME_CHAT_DEMO_TURNS", () => {
  it("covers a multi-turn chat with live tools and approval", () => {
    expect(HOME_CHAT_DEMO_TURNS.length).toBeGreaterThanOrEqual(3);
    expect(HOME_CHAT_DEMO_TURNS.map((turn) => turn.tool.app)).toEqual([
      "ClickUp",
      "Slack",
      "Gmail",
    ]);
    expect(
      HOME_CHAT_DEMO_TURNS.some((turn) => turn.assistant.toLowerCase().includes("approval")),
    ).toBe(true);
    for (const turn of HOME_CHAT_DEMO_TURNS) {
      expect(turn.user.trim().length).toBeGreaterThan(8);
      expect(turn.assistant.trim().length).toBeGreaterThan(12);
      expect(turn.tool.action.trim().length).toBeGreaterThan(3);
    }
  });
});

describe("HOME_CAPABILITIES", () => {
  it("lists host surfaces beyond chat", () => {
    expect(HOME_CAPABILITIES.map((item) => item.id)).toEqual([
      "workspaces",
      "tools",
      "playbooks",
      "approvals",
      "governance",
    ]);
    for (const item of HOME_CAPABILITIES) {
      expect(item.title.trim().length).toBeGreaterThan(0);
      expect(item.body.trim().length).toBeGreaterThan(20);
    }
  });
});

describe("HOME_FOOTER_GROUPS", () => {
  it("covers product, docs, and host columns", () => {
    expect(HOME_FOOTER_GROUPS.map((group) => group.id)).toEqual(["product", "docs", "host"]);
    const hrefs = HOME_FOOTER_GROUPS.flatMap((group) => group.links.map((link) => link.href));
    expect(hrefs).toContain("#how");
    expect(hrefs).not.toContain("#demo");
    expect(hrefs).toContain("/docs/self-hosting/architecture");
    expect(hrefs).toContain("https://github.com/akhil-naidu/brain");
    expect(hrefs).toContain(SITE_LICENSE_HREF);
    for (const group of HOME_FOOTER_GROUPS) {
      expect(group.title.trim().length).toBeGreaterThan(0);
      expect(group.links.length).toBeGreaterThanOrEqual(2);
      for (const link of group.links) {
        expect(link.label.trim().length).toBeGreaterThan(0);
        expect(link.href.trim().length).toBeGreaterThan(0);
      }
    }
  });
});
