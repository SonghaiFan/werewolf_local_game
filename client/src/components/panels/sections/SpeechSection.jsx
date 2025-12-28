import {
  PanelSection,
  PanelInfo,
  PanelActions,
  PanelProcessControl,
} from "../BasePanel";

export function SpeechSection({
  t,
  title,
  speaking,
  players,
  myId,
  isHost,
  onEndSpeech,
  onAdvance,
  customLabel,
  children,
}) {
  const currentSpeakerId = speaking?.currentSpeakerId;
  const isMyTurn = currentSpeakerId === myId;
  const speaker =
    currentSpeakerId && players ? players[currentSpeakerId] : null;
  const speakerLabel =
    customLabel ||
    (speaker
      ? isMyTurn
        ? t("you")
        : t("player_speaking", {
            number: String(speaker.avatar || "0").padStart(2, "0"),
          })
      : t("unknown_role"));

  // Default title logic if not provided
  const displayTitle =
    title || (isMyTurn ? t("your_turn_speaking") : t("listening"));

  return (
    <PanelSection title={displayTitle}>
      <PanelInfo type={isMyTurn ? "primary" : "default"}>
        <div className="font-black tracking-tight">{speakerLabel}</div>
      </PanelInfo>

      {children}

      {isMyTurn && (
        <PanelActions>
          <button
            className="btn-primary w-full col-span-2"
            onClick={onEndSpeech}
          >
            {t("end_speech")}
          </button>
        </PanelActions>
      )}

      {isHost && (
        <PanelProcessControl>
          {!isMyTurn && (
            <button
              className="btn-secondary w-full text-[10px] uppercase tracking-widest"
              onClick={onEndSpeech}
            >
              {t("admin_skip")}
            </button>
          )}
          {onAdvance && (
            <button
              className="btn-secondary w-full text-[10px] uppercase tracking-widest"
              onClick={onAdvance}
            >
              {t("advance", "Advance")}
            </button>
          )}
        </PanelProcessControl>
      )}
    </PanelSection>
  );
}
