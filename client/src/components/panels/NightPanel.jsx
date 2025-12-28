import React from "react";
import { useTranslation } from "react-i18next";
import { useGameContext } from "../../context/GameContext";
import { PanelSection, PanelInfo, IdleMessage } from "./BasePanel";
import { ActionSection } from "./sections/ActionSection";
import { IdleSection } from "./sections/IdleSection";

export default function NightPanel() {
  const { t } = useTranslation();
  const { gameState, actions } = useGameContext();
  const { phase } = gameState;
  const role = gameState.me?.role;
  const hasActed = gameState.me?.hasActed;
  const availableActions = gameState.me?.availableActions || [];
  const onAction = actions.onAction;

  if (phase === "NIGHT_START") {
    return (
      <IdleSection
        title={t("night_falls")}
        content={t("close_eyes")}
        animate={true}
      />
    );
  }

  if (hasActed) {
    return <IdleMessage>{t("waiting_for_others")}</IdleMessage>;
  }

  if (availableActions.length === 0) {
    return (
      <IdleSection title={phase.replace(/_/g, " ")} content={t("wait_turn")} />
    );
  }

  return (
    <ActionSection
      t={t}
      role={role}
      availableActions={availableActions}
      onAction={onAction}
    />
  );
}
