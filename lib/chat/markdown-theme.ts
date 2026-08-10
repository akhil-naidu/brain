/** Subscribe to document theme class changes for Streamdown Mermaid/shiki. */
export function subscribeDocumentTheme(onStoreChange: () => void): () => void {
  if (typeof document === "undefined") {
    return () => undefined;
  }
  const root = document.documentElement;
  const observer = new MutationObserver(onStoreChange);
  observer.observe(root, { attributes: true, attributeFilter: ["class"] });
  return () => {
    observer.disconnect();
  };
}

export function getDocumentIsDark(): boolean {
  if (typeof document === "undefined") {
    return false;
  }
  return document.documentElement.classList.contains("dark");
}

export function getMermaidThemeConfig(isDark: boolean) {
  if (isDark) {
    return {
      theme: "dark" as const,
      themeVariables: {
        background: "#161b22",
        primaryColor: "#1f6f8b",
        primaryTextColor: "#e6edf3",
        primaryBorderColor: "#30363d",
        secondaryColor: "#21262d",
        tertiaryColor: "#0d1117",
        lineColor: "#9198a1",
        textColor: "#e6edf3",
        mainBkg: "#161b22",
        nodeBorder: "#30363d",
        clusterBkg: "#0d1117",
        titleColor: "#e6edf3",
        edgeLabelBackground: "#161b22",
      },
    };
  }

  return {
    theme: "base" as const,
    themeVariables: {
      background: "#ffffff",
      primaryColor: "#d7e8ef",
      primaryTextColor: "#1a2a33",
      primaryBorderColor: "#9bb8c6",
      secondaryColor: "#eef4f7",
      tertiaryColor: "#f5f8fa",
      lineColor: "#5a7380",
      textColor: "#1a2a33",
      mainBkg: "#ffffff",
      nodeBorder: "#9bb8c6",
      clusterBkg: "#f5f8fa",
      titleColor: "#1a2a33",
      edgeLabelBackground: "#ffffff",
    },
  };
}
