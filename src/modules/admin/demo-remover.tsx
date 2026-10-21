"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { deleteDemoContent, type SaveResult } from "@/modules/cms/actions";

export function DemoRemover({ total }: { total: number }) {
  const [result, setResult] = useState<SaveResult | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-col items-start gap-4">
      <Button
        disabled={pending || total === 0}
        onClick={() => {
          if (
            !window.confirm(
              "Delete all demo artists, events, galleries, products and photos? This can't be undone.",
            )
          )
            return;
          start(async () => setResult(await deleteDemoContent()));
        }}
      >
        {pending ? "Removing…" : "Remove all demo content"}
      </Button>
      {result ? (
        <p
          role={result.ok ? "status" : "alert"}
          className={`text-sm ${result.ok ? "text-success" : "text-danger"}`}
        >
          {result.message}
        </p>
      ) : null}
    </div>
  );
}
