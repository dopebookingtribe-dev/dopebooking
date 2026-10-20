"use client"; // Replaces the root layout when it fails, so it brings its own html/body.

import "./globals.css";

export default function GlobalError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  console.error(error);
  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center bg-bg p-8 text-text">
        <main className="max-w-md text-center">
          <h1 className="text-3xl">DopeBooking is having a moment.</h1>
          <p className="mt-4 text-muted">Please try again shortly.</p>
          <button
            type="button"
            onClick={() => retry()}
            className="mt-8 min-h-11 rounded-md bg-accent px-5 text-sm font-medium text-accent-ink"
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
