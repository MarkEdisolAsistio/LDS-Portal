"use client";

import Link from "next/link";
import { useId, useRef, useState } from "react";

type NavDropdownItem = {
  href: string;
  label: string;
};

export function NavDropdown({
  label,
  items,
}: {
  label: string;
  items: NavDropdownItem[];
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [isPinnedOpen, setIsPinnedOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const isOpen = isHovered || isPinnedOpen;

  return (
    <div
      className="site-nav-dropdown"
      onPointerEnter={(event) => {
        if (event.pointerType !== "touch") setIsHovered(true);
      }}
      onPointerLeave={() => {
        setIsHovered(false);
        setIsPinnedOpen(false);
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setIsPinnedOpen(false);
        }
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          setIsHovered(false);
          setIsPinnedOpen(false);
          buttonRef.current?.focus();
        }
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        className="site-nav-dropdown-trigger"
        aria-expanded={isOpen}
        aria-controls={menuId}
        onClick={(event) => {
          if (event.detail === 0 || !isHovered) {
            setIsPinnedOpen((open) => !open);
          }
        }}
      >
        {label}
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          className="site-nav-dropdown-arrow"
          data-open={isOpen}
        >
          <path d="m4 6 4 4 4-4" />
        </svg>
      </button>
      {isOpen && (
        <div id={menuId} className="site-nav-dropdown-menu">
          {items.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
