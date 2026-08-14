import defaultMdxComponents from "fumadocs-ui/mdx";
import type { MDXComponents } from "mdx/types";
import { ArchitectureDiagramFrame } from "@/components/architecture-diagram";

/**
 * Shared MDX component map for Brain customer docs.
 * Extend here when adding Callouts, Tabs, Steps, etc. in content.
 */
export function getDocsMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...defaultMdxComponents,
    ArchitectureDiagramFrame,
    ...components,
  };
}
