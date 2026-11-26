"use client";

import type { NodeProps } from "@xyflow/react";
import { Plus, Workflow } from "lucide-react";
import { Button } from "@/components/ui/button";

type AddNodeData = {
  onClick?: () => void;
};

export function AddNode({ data }: NodeProps & { data?: AddNodeData }) {
  return (
    <section
      aria-labelledby="workflow-empty-state-title"
      className="w-[min(36rem,calc(100vw-2rem))] rounded-xl border border-border bg-card/95 p-6 shadow-xl backdrop-blur-sm sm:p-8"
    >
      <div className="mb-6 flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Workflow aria-hidden="true" />
        </span>
        <p className="font-medium text-muted-foreground text-xs uppercase tracking-[0.18em]">
          Workflow studio
        </p>
      </div>

      <div className="mb-6">
        <h1
          className="font-semibold text-2xl tracking-tight sm:text-3xl"
          id="workflow-empty-state-title"
        >
          Start with a trigger. Build from there.
        </h1>
        <p className="mt-3 max-w-lg text-muted-foreground text-sm leading-relaxed sm:text-base">
          Choose what starts your workflow, connect the steps that follow, then
          run a test before putting it to work.
        </p>
      </div>

      <ol
        aria-label="Workflow creation steps"
        className="mb-6 grid grid-cols-3 gap-2 sm:gap-3"
      >
        {["Choose a trigger", "Connect steps", "Run a test"].map(
          (step, index) => (
            <li
              className="rounded-lg border border-border/70 bg-background/70 p-3"
              key={step}
            >
              <span className="mb-2 block font-mono text-muted-foreground text-xs">
                0{index + 1}
              </span>
              <span className="font-medium text-xs leading-snug sm:text-sm">
                {step}
              </span>
            </li>
          )
        )}
      </ol>

      <Button
        className="w-full justify-center gap-2 shadow-sm"
        onClick={data.onClick}
        size="default"
      >
        <Plus data-icon="inline-start" />
        Add your first trigger
      </Button>

      <p className="mt-4 text-center text-muted-foreground text-xs">
        Built with{" "}
        <a
          className="underline underline-offset-2 transition-colors hover:text-foreground"
          href="https://useworkflow.dev/"
          rel="noopener noreferrer"
          target="_blank"
        >
          Workflow
        </a>
        ,{" "}
        <a
          className="underline underline-offset-2 transition-colors hover:text-foreground"
          href="https://ai-sdk.dev/"
          rel="noopener noreferrer"
          target="_blank"
        >
          AI SDK
        </a>
        , and{" "}
        <a
          className="underline underline-offset-2 transition-colors hover:text-foreground"
          href="https://vercel.com/ai-gateway"
          rel="noopener noreferrer"
          target="_blank"
        >
          AI Gateway
        </a>
        .
      </p>
    </section>
  );
}
