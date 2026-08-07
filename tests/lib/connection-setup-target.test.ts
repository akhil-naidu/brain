import { describe, expect, it } from "vitest";
import {
  connectionSetupCanManageBoth,
  resolveConnectionSetupTarget,
} from "@/lib/chat/connection-setup-target";

describe("resolveConnectionSetupTarget", () => {
  it("prefers workspace BYOA when the member can manage it", () => {
    expect(
      resolveConnectionSetupTarget({
        workspaceCanManage: true,
        hostCanManage: true,
      }),
    ).toBe("workspace");
  });

  it("uses host setup when only the instance admin can manage credentials", () => {
    expect(
      resolveConnectionSetupTarget({
        workspaceCanManage: false,
        hostCanManage: true,
      }),
    ).toBe("host");
  });

  it("returns none when neither path is manageable", () => {
    expect(
      resolveConnectionSetupTarget({
        workspaceCanManage: false,
        hostCanManage: false,
      }),
    ).toBe("none");
    expect(
      resolveConnectionSetupTarget({
        workspaceCanManage: undefined,
        hostCanManage: undefined,
      }),
    ).toBe("none");
  });
});

describe("connectionSetupCanManageBoth", () => {
  it("is true only when workspace and host can both manage", () => {
    expect(
      connectionSetupCanManageBoth({
        workspaceCanManage: true,
        hostCanManage: true,
      }),
    ).toBe(true);
    expect(
      connectionSetupCanManageBoth({
        workspaceCanManage: true,
        hostCanManage: false,
      }),
    ).toBe(false);
  });
});
