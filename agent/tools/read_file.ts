import { readFile } from "eve/tools/defaults";
import { gateHarnessTool } from "@/agent/lib/gate-harness-tool";

export default gateHarnessTool(readFile);
