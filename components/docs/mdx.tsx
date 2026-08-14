import defaultMdxComponents from "fumadocs-ui/mdx";
import type { MDXComponents } from "mdx/types";
import { ArchitectureDiagramFrame } from "@/components/architecture-diagram";
import { Tab, Tabs } from "@/components/docs/os-tabs";

/**
 * Shared MDX component map for Brain customer docs.
 * Extend here when adding Callouts, Tabs, Steps, etc. in content.
 */
export function getDocsMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...defaultMdxComponents,
    ArchitectureDiagramFrame,
    Tab,
    Tabs,
    ...components,
  };
}
