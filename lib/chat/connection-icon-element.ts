/** DOM brand marks for contenteditable mention chips (mirrors `components/icons.tsx`). */

const SVG_NS = "http://www.w3.org/2000/svg";

type SvgChild =
  | { readonly type: "path"; readonly d: string; readonly fill?: string; readonly stroke?: string }
  | {
      readonly type: "circle";
      readonly cx: string;
      readonly cy: string;
      readonly r: string;
      readonly fill?: string;
    };

type SvgIconSpec = {
  readonly viewBox: string;
  readonly fill?: string;
  readonly children: readonly SvgChild[];
};

const CONNECTION_SVG: Readonly<Record<string, SvgIconSpec>> = {
  clickup: {
    viewBox: "0 0 24 24",
    children: [
      {
        type: "path",
        d: "M12.04 6.15 5.472 11.81 2.436 8.29 12.055 0l9.543 8.296-3.05 3.509z",
        fill: "#7B68EE",
      },
      {
        type: "path",
        d: "M2 18.439 5.69 15.611C7.651 18.171 9.734 19.35 12.053 19.35c2.307 0 4.33-1.166 6.203-3.704L22 18.405C19.298 22.065 15.941 24 12.053 24 8.178 24 4.788 22.078 2 18.439z",
        fill: "#FF02F0",
      },
    ],
  },
  slack: {
    viewBox: "0 0 24 24",
    children: [
      {
        type: "path",
        d: "M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z",
        fill: "#E01E5A",
      },
      {
        type: "path",
        d: "M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z",
        fill: "#36C5F0",
      },
      {
        type: "path",
        d: "M18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zm-1.268 0a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312z",
        fill: "#2EB67D",
      },
      {
        type: "path",
        d: "M15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zm0-1.268a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z",
        fill: "#ECB22E",
      },
    ],
  },
  asana: {
    viewBox: "0 0 24 24",
    children: [
      { type: "circle", cx: "12", cy: "5.348", r: "5.22", fill: "#F06A6A" },
      { type: "circle", cx: "5.22", cy: "17.873", r: "5.22", fill: "#F06A6A" },
      { type: "circle", cx: "18.78", cy: "17.873", r: "5.22", fill: "#F06A6A" },
    ],
  },
  gmail: {
    viewBox: "52 42 88 66",
    children: [
      { type: "path", d: "M58 108h14V74L52 59v43c0 3.32 2.69 6 6 6", fill: "#4285F4" },
      { type: "path", d: "M120 108h14c3.32 0 6-2.69 6-6V59l-20 15", fill: "#34A853" },
      {
        type: "path",
        d: "M120 48v26l20-15v-8c0-7.42-8.47-11.65-14.4-7.2",
        fill: "#FBBC04",
      },
      { type: "path", d: "M72 74V48l24 18 24-18v26L96 92", fill: "#EA4335" },
      {
        type: "path",
        d: "M52 51v8l20 15V48l-5.6-4.2c-5.94-4.45-14.4-.22-14.4 7.2",
        fill: "#C5221F",
      },
    ],
  },
  github: {
    viewBox: "0 0 24 24",
    fill: "currentColor",
    children: [
      {
        type: "path",
        d: "M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.207 11.387.6.113.793-.26.793-.577 0-.285-.01-1.04-.016-2.04-3.338.726-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.09-.745.083-.73.083-.73 1.205.085 1.84 1.237 1.84 1.237 1.07 1.834 2.809 1.304 3.495.997.108-.775.418-1.305.76-1.605-2.665-.304-5.467-1.332-5.467-5.93 0-1.31.468-2.382 1.236-3.222-.124-.303-.536-1.524.117-3.176 0 0 1.008-.322 3.3 1.23a11.5 11.5 0 0 1 3.003-.404c1.02.005 2.047.138 3.003.404 2.29-1.552 3.297-1.23 3.297-1.23.655 1.652.243 2.873.12 3.176.77.84 1.235 1.912 1.235 3.222 0 4.61-2.807 5.624-5.48 5.92.43.372.813 1.102.813 2.222 0 1.606-.014 2.902-.014 3.296 0 .32.192.694.8.576C20.565 21.796 24 17.3 24 12 24 5.37 18.63 0 12 0z",
      },
    ],
  },
  snowflake: {
    viewBox: "0 0 24 24",
    children: [
      {
        type: "path",
        d: "M12 2.25v19.5M4.5 6.75l15 10.5M4.5 17.25l15-10.5M7.5 3.75l9 16.5M16.5 3.75l-9 16.5",
        stroke: "#29B5E8",
      },
      { type: "circle", cx: "12", cy: "12", r: "1.75", fill: "#29B5E8" },
    ],
  },
  notion: {
    viewBox: "0 0 24 24",
    fill: "currentColor",
    children: [
      {
        type: "path",
        d: "M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 2.35c-.42-.326-.98-.7-2.055-.607L3.01 2.914c-.514.047-.6.327-.514.607l1.963.687zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-14.106.793c-.56.046-.818.327-.818 1.027zm13.748.607c.093.42 0 .84-.42.888l-.7.14v10.264c-.607.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.953l1.45.327s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.62c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.14c-.093-.514.28-.887.747-.933l3.223-.186z",
      },
    ],
  },
  linear: {
    viewBox: "0 0 24 24",
    children: [
      {
        type: "path",
        d: "M3 14.5 12.5 3a1.5 1.5 0 0 1 2.5 1.1V9a1 1 0 0 0 1 1h4.4A1.5 1.5 0 0 1 21 12.5L11.5 21A1.5 1.5 0 0 1 9 19.9V15a1 1 0 0 0-1-1H3.6A1.5 1.5 0 0 1 3 14.5z",
        fill: "#5E6AD2",
      },
    ],
  },
  atlassian: {
    viewBox: "0 0 24 24",
    children: [
      {
        type: "path",
        d: "M7.62 18.52 1.5 8.2c-.34-.57-.04-1.3.63-1.45 1.9-.42 5.5-.84 8.37 1.6L7.62 18.52zm8.76 0 2.88-4.88c.4-.67-.05-1.53-.82-1.53H9.7c-.42 0-.8.23-.99.6L7.62 18.52h8.76z",
        fill: "#2684FF",
      },
    ],
  },
  zernio: {
    viewBox: "0 0 24 24",
    children: [
      {
        type: "path",
        d: "M7 7.5h10l-10 9h10",
        stroke: "#111827",
      },
    ],
  },
  sentry: {
    viewBox: "0 0 24 24",
    children: [
      {
        type: "path",
        d: "M13.91 2.5a1.4 1.4 0 0 0-2.42 0L2.2 18.2A1.4 1.4 0 0 0 3.41 20.3h4.2a7.3 7.3 0 0 1 9.78-9.78V4.9A1.4 1.4 0 0 0 13.91 2.5z",
        fill: "#362D59",
      },
    ],
  },
  mongodb: {
    viewBox: "0 0 24 24",
    children: [
      {
        type: "path",
        d: "M12 2c1.2 3.2 2.8 5.4 3.6 8.2.7 2.4.5 4.7-.6 6.7-.8 1.5-2 2.6-3 3.6v1.5h-1v-1.5c-1-.9-2.2-2-3-3.5-1.1-2-.8-4.4-.1-6.8C8.7 7.4 10.4 5.2 12 2z",
        fill: "#00684A",
      },
      {
        type: "path",
        d: "M12 14.5v5",
        stroke: "#13AA52",
      },
    ],
  },
  toolbox: {
    viewBox: "0 0 24 24",
    children: [
      {
        type: "path",
        d: "M4 9.5h16v9.25A1.75 1.75 0 0 1 18.25 20.5H5.75A1.75 1.75 0 0 1 4 18.75V9.5z",
        fill: "#4285F4",
      },
      {
        type: "path",
        d: "M8 9.5V7.25A2.25 2.25 0 0 1 10.25 5h3.5A2.25 2.25 0 0 1 16 7.25V9.5",
        stroke: "#1967D2",
      },
      {
        type: "path",
        d: "M4 12.5h16",
        stroke: "#E8F0FE",
      },
    ],
  },
};

function createSvgFromSpec(
  documentRef: Document,
  spec: SvgIconSpec,
  className: string,
): SVGSVGElement {
  const svg = documentRef.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", spec.viewBox);
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("class", className);
  if (spec.fill) {
    svg.setAttribute("fill", spec.fill);
  } else {
    svg.setAttribute("fill", "none");
  }

  for (const child of spec.children) {
    if (child.type === "path") {
      const path = documentRef.createElementNS(SVG_NS, "path");
      path.setAttribute("d", child.d);
      if (child.fill) {
        path.setAttribute("fill", child.fill);
      }
      if (child.stroke) {
        path.setAttribute("stroke", child.stroke);
        path.setAttribute("stroke-linecap", "round");
        path.setAttribute("stroke-width", "1.75");
      }
      svg.appendChild(path);
    } else {
      const circle = documentRef.createElementNS(SVG_NS, "circle");
      circle.setAttribute("cx", child.cx);
      circle.setAttribute("cy", child.cy);
      circle.setAttribute("r", child.r);
      if (child.fill) {
        circle.setAttribute("fill", child.fill);
      }
      svg.appendChild(circle);
    }
  }

  return svg;
}

/** Build a brand mark element for a connection id, or null when unknown. */
export function createConnectionIconElement(
  documentRef: Document,
  connectionId: string,
  className = "size-3 shrink-0",
): HTMLElement | SVGSVGElement | null {
  const id = connectionId.trim().toLowerCase();
  if (id === "dflow") {
    const img = documentRef.createElement("img");
    img.src = "/images/dflow-no-bg.png?v=1";
    img.alt = "";
    img.setAttribute("aria-hidden", "true");
    img.className = `${className} object-contain`;
    return img;
  }

  const spec = CONNECTION_SVG[id];
  if (!spec) {
    return null;
  }
  return createSvgFromSpec(documentRef, spec, className);
}

export function connectionIdFromMentionItemId(itemId: string): string | null {
  const trimmed = itemId.trim();
  if (!trimmed.startsWith("connection:")) {
    return null;
  }
  const id = trimmed.slice("connection:".length).trim();
  return id || null;
}
