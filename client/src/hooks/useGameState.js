import { useState, useEffect } from "react";

export function useGameState(socket) {
  const [gameState, setGameState] = useState({
    phase: "WAITING",
    players: {},
    logs: [],
    round: 0,
    me: { role: null, status: "alive" },
  });
  const [inspectedPlayers, setInspectedPlayers] = useState({});

  useEffect(() => {
    function onGameState(state) {
      setGameState((prev) => ({ ...prev, ...state }));
      if (state.phase === "WAITING" || state.round === 0) {
        setInspectedPlayers({});
      }
    }

    function onNotification(msg) {
      console.log("[Notification]", msg);
    }

    function onSeerResult({ targetId, role }) {
      const normalizedRole = role ? role.toUpperCase() : "UNKNOWN";
      setInspectedPlayers((prev) => ({
        ...prev,
        [targetId]: normalizedRole,
      }));
    }

    socket.on("game_state", onGameState);
    socket.on("notification", onNotification);
    socket.on("seer_result", onSeerResult);

    return () => {
      socket.off("game_state", onGameState);
      socket.off("notification", onNotification);
      socket.off("seer_result", onSeerResult);
    };
  }, [socket]);

  return { gameState, setGameState, inspectedPlayers, setInspectedPlayers };
}
