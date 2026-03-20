/* eslint-disable react-hooks/refs */
"use client";

import { useState } from "react";
import {
  useFloating,
  autoUpdate,
  offset,
  flip,
  shift,
  useHover,
  useFocus,
  useDismiss,
  useRole,
  useInteractions,
  FloatingPortal,
  Placement,
  FloatingArrow,
  arrow,
} from "@floating-ui/react";
import { useRef } from "react";

export function FloatingTooltip({
  children,
  content,
  placement = "top",
}: {
  children: React.ReactNode;
  content: React.ReactNode;
  placement?: Placement;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const arrowRef = useRef(null);

  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    placement,
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(8),
      flip({ fallbackAxisSideDirection: "end" }),
      shift({ padding: 5 }),
      arrow({ element: arrowRef }),
    ],
  });

  const hover = useHover(context, { move: false, delay: { open: 150, close: 0 } });
  const focus = useFocus(context);
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: "tooltip" });

  const { getReferenceProps, getFloatingProps } = useInteractions([
    hover,
    focus,
    dismiss,
    role,
  ]);

  return (
    <>
      <div ref={refs.setReference} {...getReferenceProps()} className="inline-flex">
        {children}
      </div>
      {isOpen && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={{ ...floatingStyles, zIndex: 100 }}
            {...getFloatingProps()}
            className="bg-black/80 backdrop-blur-md border border-white/10 text-white px-3 py-1.5 rounded-lg shadow-xl text-sm font-medium animate-in fade-in zoom-in-95 duration-200"
          >
            <FloatingArrow ref={arrowRef} context={context} fill="rgba(0,0,0,0.8)" />
            {content}
          </div>
        </FloatingPortal>
      )}
    </>
  );
}
