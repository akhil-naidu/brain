import type { ComponentPropsWithoutRef } from "react";
import defaultMdxComponents from "fumadocs-ui/mdx";
import type { MDXComponents } from "mdx/types";
import { ArchitectureDiagramFrame } from "@/components/architecture-diagram";
import { DocsTaskCheckbox } from "@/components/docs/docs-task-checkbox";
import { Tab, Tabs } from "@/components/docs/os-tabs";

function DocsInput(props: ComponentPropsWithoutRef<"input">) {
  if (props.type === "checkbox") {
    return <DocsTaskCheckbox {...props} />;
  }
  return <input {...props} />;
}

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
    input: DocsInput,
    ...components,
  };
}
