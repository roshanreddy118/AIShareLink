"use client";

import { useEffect } from "react";

interface AmbientShellProps {
  children: React.ReactNode;
  className?: string;
}

export function AmbientShell({ children, className = "" }: AmbientShellProps) {
  useEffect(() => {
    let frame = 0;

    const handleMove = (event: MouseEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const x = `${(event.clientX / window.innerWidth) * 100}%`;
        const y = `${(event.clientY / window.innerHeight) * 100}%`;
        document.documentElement.style.setProperty("--spotlight-x", x);
        document.documentElement.style.setProperty("--spotlight-y", y);
      });
    };

    window.addEventListener("mousemove", handleMove, { passive: true });

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("mousemove", handleMove);
    };
  }, []);

  return <main className={`ambient-shell ${className}`.trim()}>{children}</main>;
}
