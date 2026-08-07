import { describe, expect, it } from "vitest";
import { HOME_CAPABILITIES, HOME_TOUR_SCENES } from "@/lib/features/catalog";

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

describe("HOME_CAPABILITIES", () => {
  it("lists host surfaces beyond chat", () => {
    expect(HOME_CAPABILITIES.map((item) => item.id)).toEqual([
      "workspaces",
      "tools",
      "playbooks",
      "governance",
    ]);
    for (const item of HOME_CAPABILITIES) {
      expect(item.title.trim().length).toBeGreaterThan(0);
      expect(item.body.trim().length).toBeGreaterThan(20);
    }
  });
});
