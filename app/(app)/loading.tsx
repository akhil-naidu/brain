import { BrainBoot } from "@/components/loading/brain-boot";

export default function AppLoading() {
  return (
    <div className="flex h-full min-h-0 flex-1 items-center justify-center px-4">
      <BrainBoot label="Opening…" size="lg" />
    </div>
  );
}
