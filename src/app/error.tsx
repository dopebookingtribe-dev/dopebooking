"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Meta } from "@/components/ui/meta";

export default function ErrorPage({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  useEffect(() => {
    // Picked up by the hosting logs (and an error tracker once added).
    console.error(error);
  }, [error]);

  return (
    <Container className="py-24 sm:py-32">
      <Meta>Error</Meta>
      <h1 className="mt-4 max-w-3xl font-display text-headline">
        Something went off-beat.
      </h1>
      <p className="mt-6 max-w-xl text-muted">
        This page couldn&apos;t load. Try again, and if it keeps happening, come
        back in a few minutes.
      </p>
      <div className="mt-10 flex flex-wrap gap-3">
        <Button onClick={() => retry()}>Try again</Button>
        <ButtonLink href="/" variant="secondary">
          Back to home
        </ButtonLink>
      </div>
    </Container>
  );
}
