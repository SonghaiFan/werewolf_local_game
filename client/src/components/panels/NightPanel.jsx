import React from "react";
import { useTranslation } from "react-i18next";
import { useGameContext } from "../../context/GameContext";
import { PanelSection, PanelInfo } from "./BasePanel";

export default function NightPanel() {
  const { t } = useTranslation();
  const { gameState, actions } = useGameContext();
  const { phase } = gameState;
  const role = gameState.me?.role;
  const hasActed = gameState.me?.hasActed;
  const availableActions = gameState.me?.availableActions || [];
  const isPoisoned = gameState.me?.isPoisoned;
  const onAction = actions.onAction;

  if (phase === "NIGHT_START") {
    return (
      <PanelSection>
        <PanelInfo>
          <div className="font-mono text-[10px] mb-2 text-muted opacity-60 uppercase tracking-[0.2em]">
            {t("night_falls")}
          </div>
          <p className="text-sm text-ink/90 font-medium animate-pulse">
            {t("close_eyes")}
          </p>
        </PanelInfo>
      </PanelSection>
    );
  }

  if (hasActed) {
    return (
      <PanelSection>
        <button
          className="btn-secondary w-full opacity-50 cursor-not-allowed"
          disabled
        >
          {t("waiting_for_others")}
        </button>
      </PanelSection>
    );
  }

  // Private Warning for Poisoned Hunter
  if (role === "HUNTER" && isPoisoned) {
    return (
      <PanelSection>
        <PanelInfo type="danger">
          <div className="font-mono text-[10px] mb-2 text-danger uppercase tracking-[0.2em]">
            {t("roles.HUNTER")}
          </div>
          <p className="text-sm text-danger/80 font-medium">
            {t("hunter_poisoned_hint")}
          </p>
        </PanelInfo>
      </PanelSection>
    );
  }

  if (availableActions.length === 0) {
    return (
      <PanelSection>
        <PanelInfo>
          <div className="font-mono text-[10px] mb-1 text-muted opacity-40 uppercase tracking-[0.2em]">
            {phase.replace(/_/g, " ")}
          </div>
          <p className="text-sm text-muted font-medium italic">
            {t("wait_turn")}
          </p>
        </PanelInfo>
      </PanelSection>
    );
  }

  const mainActions = availableActions.filter((a) => a.type !== "skip");
  const skipAction = availableActions.find((a) => a.type === "skip");

  return (
    <PanelSection className="space-y-3">
      <div className="text-[10px] text-primary font-bold uppercase tracking-widest mb-1 text-center opacity-60">
        {t(`${role?.toLowerCase()}_wake`, t("identity"))}
      </div>
      <div
        className={`grid ${
          mainActions.length > 1 ? "grid-cols-2" : "grid-cols-1"
        } gap-3`}
      >
        {mainActions.map((action) => (
          <button
            key={action.type}
            className={`btn-base px-4 py-3 rounded-[var(--radius-lg)] font-medium text-sm transition-all 
                                ${
                                  action.disabled
                                    ? "bg-zinc-800 text-zinc-500 border-zinc-700/30 cursor-not-allowed shadow-none opacity-50"
                                    : "bg-primary/10 text-primary border-primary/20 hover:bg-primary hover:text-white"
                                }`}
            onClick={() => {
              if (!action.disabled) {
                onAction(action.type, action.needsTarget);
              } else if (action.disabledReason) {
                alert(t(action.disabledReason));
              }
            }}
          >
            {t(action.label)}{" "}
            {action.disabled ? `(${t("consumed", "Consumed")})` : ""}
          </button>
        ))}
      </div>
      {skipAction && (
        <button
          className="btn-outline w-full py-2 text-[10px] uppercase tracking-widest opacity-60 hover:opacity-100"
          onClick={() => onAction("skip", false)}
        >
          {t("do_nothing")}
        </button>
      )}
    </PanelSection>
  );
}
