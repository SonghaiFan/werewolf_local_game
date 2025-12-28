import React, { useState, useEffect } from "react";
import { RoleIcons } from "../RoleIcons";

const TITLE = "WEREWOLF";
const ROLES_LIST = Object.keys(RoleIcons).filter((r) => r !== "UNKNOWN");

export default function LandingHeader({ t, name, setName }) {
  const [glitch, setGlitch] = useState({ index: -1, role: null });

  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.7) {
        // 30% chance to glitch each tick
        // No-op to avoid too frequent
      } else {
        const index = Math.floor(Math.random() * TITLE.length);
        const role = ROLES_LIST[Math.floor(Math.random() * ROLES_LIST.length)];
        setGlitch({ index, role });
        setTimeout(
          () => setGlitch({ index: -1, role: null }),
          100 + Math.random() * 200
        );
      }
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="text-center w-full">
      <h1
        className="text-4xl font-black tracking-tighter mb-8 opacity-90 flex w-full max-w-[320px] mx-auto justify-between items-center"
        style={{ fontFamily: "var(--font-heading)" }}
      >
        {TITLE.split("").map((char, i) => (
          <span
            key={i}
            className="w-8 md:w-10 relative flex justify-center text-center"
          >
            {glitch.index === i ? (
              <div className="w-8 h-8 md:w-10 md:h-10 text-primary animate-pulse flex items-center justify-center">
                {RoleIcons[glitch.role]}
              </div>
            ) : (
              <span>{char}</span>
            )}
          </span>
        ))}
      </h1>

      {/* Name Input - Always visible, clean interaction */}
      <div className="relative group w-full max-w-[200px] mx-auto">
        <input
          type="text"
          placeholder={t("enter_name")}
          className="w-full bg-transparent border-b border-border/50 text-center text-lg py-2 focus:border-primary outline-none transition-all placeholder:text-muted/30"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <div className="absolute inset-x-0 bottom-0 h-[1px] bg-primary scale-x-0 group-focus-within:scale-x-100 transition-transform duration-300" />
      </div>
    </div>
  );
}
