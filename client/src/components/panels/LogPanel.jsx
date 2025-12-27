import React, { useEffect, useRef } from "react";

export default function LogPanel({ logs }) {
  const logsEndRef = useRef(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  return (
    <div className="flex-grow flex flex-col justify-end font-medium text-xs list-none overflow-y-auto p-2 h-full scrollbar-hide space-y-1">
      {logs.slice(-5).map((log, i) => (
        <div
          key={i}
          className={`text-center transition-all opacity-0 animate-in ${
            i === logs.slice(-5).length - 1 ? "text-primary" : "text-muted/60"
          }`}
          style={{ animationDelay: `${i * 50}ms` }}
        >
          {log}
        </div>
      ))}
      <div ref={logsEndRef} />
    </div>
  );
}
