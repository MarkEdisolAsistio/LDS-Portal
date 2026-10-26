"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import type { SiteSearchResult } from "@/lib/site-search";

export function SiteSearch() {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<SiteSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const wrapperRef = useRef<HTMLFormElement>(null);
  const inputId = useId();
  const listId = useId();
  const normalizedQuery = query.trim();
  const showSuggestions = isOpen && normalizedQuery.length > 0;

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !wrapperRef.current?.contains(event.target)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isOpen]);

  useEffect(() => {
    if (!showSuggestions) return;

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setIsLoading(true);
      setSearchError("");
      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(normalizedQuery)}`,
          { signal: controller.signal }
        );
        const data: { results?: SiteSearchResult[]; error?: string } =
          await response.json();
        if (!response.ok) {
          throw new Error(data.error ?? "Search could not be completed.");
        }
        setResults(data.results ?? []);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setSearchError(
          error instanceof Error
            ? error.message
            : "Search could not be completed. Please try again."
        );
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }, 200);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [normalizedQuery, showSuggestions]);

  return (
    <form
      ref={wrapperRef}
      action="/search"
      className="site-search"
      onSubmit={() => setIsOpen(false)}
    >
      <label htmlFor={inputId} className="sr-only">
        Search the site
      </label>
      <div className="site-search-field">
        <input
          id={inputId}
          type="search"
          name="q"
          value={query}
          placeholder="Search the site"
          maxLength={100}
          autoComplete="off"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={showSuggestions}
          aria-controls={listId}
          className="site-search-input"
          onFocus={() => {
            setIsOpen(true);
            if (normalizedQuery) setIsLoading(true);
          }}
          onChange={(event) => {
            const nextQuery = event.currentTarget.value;
            setQuery(nextQuery);
            setIsOpen(true);
            setResults([]);
            setSearchError("");
            setIsLoading(Boolean(nextQuery.trim()));
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") setIsOpen(false);
          }}
        />
        <button type="submit" className="site-search-submit" aria-label="Search">
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <circle cx="10.8" cy="10.8" r="6.5" />
            <path d="m16 16 4.5 4.5" />
          </svg>
        </button>
      </div>

      {showSuggestions && (
        <div id={listId} className="site-search-suggestions">
          {isLoading ? (
            <p className="site-search-empty">Searching the site…</p>
          ) : searchError ? (
            <p className="site-search-empty" role="alert">
              {searchError}
            </p>
          ) : results.length ? (
            results.slice(0, 5).map((result) => (
              <Link
                key={`${result.type}:${result.href}`}
                href={result.href}
                className="site-search-result"
                onClick={() => setIsOpen(false)}
              >
                <span className="site-search-result-title">
                  {result.title}
                </span>
                <span className="site-search-result-description">
                  {[
                    result.type === "product" ? result.categoryName : undefined,
                    result.description,
                  ]
                    .filter(Boolean)
                    .join(" · ") || `View ${result.type} details`}
                </span>
              </Link>
            ))
          ) : (
            <p className="site-search-empty">
              No results match “{normalizedQuery}”.
            </p>
          )}
        </div>
      )}
    </form>
  );
}
