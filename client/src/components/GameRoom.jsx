import React, { useState, useEffect } from 'react';
import { socket } from '../socket';
import ControlPanel from './ControlPanel';
import PlayerGrid from './PlayerGrid';
import AvatarCard from './AvatarCard';
import { useTranslation } from 'react-i18next';
import GameContext from '../context/GameContext';

export default function GameRoom({ roomId, myId, onExit }) {
    const { t } = useTranslation();
    const [gameState, setGameState] = useState({
        phase: 'WAITING',
        players: {},
        logs: [],
        round: 0,
        me: { role: null, status: 'alive' }
    });
    
    const [selectedTarget, setSelectedTarget] = useState(null);
    const [serverIP, setServerIP] = useState(null);
    const [inspectedPlayers, setInspectedPlayers] = useState({});

    useEffect(() => {
        socket.on('server_config', ({ ip }) => {
            setServerIP(ip);
        });
        function onGameState(state) {
            setGameState(prev => ({
                ...prev,
                ...state
            }));
            // Clear inspections on new game (round 0 or 1 restart?)
            // Simple check: if round changes to 0 or 1 from high number? 
            // Better: reset on start_game event or clean manual reset?
            // For now, let's just keep valid. User usually refreshes or we can clear on 'FINISHED' -> 'WAITING' transition?
            // Let's listen to game over or reset explicitly if possible or just let it be for now.
        }

        function onNotification(msg) {
             // You could add this to logs locally if not from server logs
             // But server adds logs to game state usually
        }

        function onSeerResult({ targetId, role }) {
             // Update local state to show on card
             // Normalize role to uppercase to match RoleIcons keys
             const normalizedRole = role ? role.toUpperCase() : 'UNKNOWN';
             setInspectedPlayers(prev => ({
                 ...prev,
                 [targetId]: normalizedRole
             }));
        }

        socket.on('game_state', onGameState);
        socket.on('notification', onNotification);
        socket.on('seer_result', onSeerResult);

        // Initial fetch if needed, but usually server sends on join
        
        return () => {
            socket.off('game_state', onGameState);
            socket.off('notification', onNotification);
            socket.off('seer_result', onSeerResult);
        };
    }, [t]);

    // Voice Judge Effect
    useEffect(() => {
        function onVoiceCue({ text }) {
             // Only Host plays audio
             if (gameState.hostId === myId) {
                 const utterance = new SpeechSynthesisUtterance(text);
                 // Force Chinese
                 utterance.lang = 'zh-CN';
                 
                 // Try to pick a Chinese voice
                 const voices = window.speechSynthesis.getVoices();
                 const zhVoice = voices.find(v => v.lang.includes('zh') || v.lang.includes('CN'));
                 if (zhVoice) {
                     utterance.voice = zhVoice;
                 }

                 utterance.rate = 0.9;
                 utterance.pitch = 0.8; 
                 window.speechSynthesis.speak(utterance);
             }
        }
        socket.on('voice_cue', onVoiceCue);
        return () => socket.off('voice_cue', onVoiceCue);
    }, [gameState.hostId, myId]);



    const mePlayer = gameState.players[myId] || { ...gameState.me, name: t('you'), id: myId, avatar: 1 };
    const otherPlayers = Object.values(gameState.players).filter(p => p.id !== myId);

    const actions = {
        onStartGame: () => {
            socket.emit('start_game', { roomId });
            setInspectedPlayers({});
        },
        onPlayerReady: () => socket.emit('player_ready', { roomId }),
        onNightAction: () => {
            if (selectedTarget) {
                const role = gameState.me?.role;
                let type = 'kill'; 
                if (role === 'SEER') type = 'check';
                    
                socket.emit('night_action', { roomId, action: { type, targetId: selectedTarget } });
                setSelectedTarget(null);
            } else {
                alert(t('select_target_first'));
            }
        },
        onWitchAction: (type) => { 
            if (type === 'poison' && !selectedTarget) {
                alert(t('select_poison_target'));
                return;
            }
            socket.emit('night_action', { roomId, action: { type, targetId: selectedTarget } });
            setSelectedTarget(null);
        },
        onDayVote: () => {
            if(selectedTarget) {
                socket.emit('day_vote', { roomId, targetId: selectedTarget });
                setSelectedTarget(null);
            } else {
                alert(t('select_vote_target'));
            }
        },
        onResolvePhase: () => socket.emit('resolve_phase', { roomId }),
        onSkipTurn: () => setSelectedTarget(null),
        onEndSpeech: () => socket.emit('end_speech', { roomId }),
        onPlayAgain: () => {
            socket.emit('play_again', { roomId });
            setInspectedPlayers({});
        }
    };

    const contextValue = {
        gameState,
        myId,
        hostId: gameState.hostId,
        executedId: gameState.executedId,
        actions,
        inspectedPlayers,
        candidates: gameState.candidates || [],
        wolfTarget: gameState.wolfTarget || gameState.me?.wolfTarget,
        selectedTarget,
        setSelectedTarget,
        role: gameState.me?.role,
        phase: gameState.phase,
        roomId,
        serverIP
    };

    return (
        <GameContext.Provider value={contextValue}>
            <div className="werewolf-app">
            {/* Background effects */}
            <div className="grain-overlay">
                <svg width="100%" height="100%">
                    <filter id="photocopy-noise">
                        <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
                        <feColorMatrix type="matrix" values="0 0 0 0 0, 0 0 0 0 0, 0 0 0 0 0, 0 0 0 1 0" />
                        <feComponentTransfer>
                            <feFuncA type="table" tableValues="0 0.5" />
                        </feComponentTransfer>
                    </filter>
                    <rect width="100%" height="100%" filter="url(#photocopy-noise)" />
                </svg>
            </div>
            
            <div className="photostat-root relative w-full h-[100dvh] p-2 grid grid-rows-[100px_1fr_80px_160px] gap-2.5 contrast-125 brightness-110 z-10 max-w-lg mx-auto border-x-0 md:border-x border-[#333] overflow-hidden">
                <div className="scanline"></div>
                <div className="photocopy-texture"></div>

                {/* 1. HEADER */}
                <header className="game-header z-10 flex justify-between items-start h-[100px]">
                    <div className="bg-accent text-black p-2 font-bold w-[100px] h-[100px] flex items-center justify-center text-center uppercase leading-none border-2 border-black">
                        <div className="glitch-text text-xl">WERE<br/>WOLF</div>
                    </div>
                    
                    <div className="flex-1 ml-2.5 flex flex-col items-end">
                       <div className="status-tag bg-white text-black px-3 py-1 font-mono font-bold text-sm uppercase mb-1 [clip-path:polygon(0_0,95%_0,100%_100%,5%_100%)]">
                            {gameState.phase.replace('_', ' ')}
                        </div>
                        <div className="h-[2px] w-full bg-accent my-1"></div>
                        <div className="font-mono text-xs text-[#888]">
                            {t('room')}: {roomId} // {t('round_short')}: {gameState.round}
                        </div>
                    </div>
                </header>

                {/* 2. MAIN STAGE (Others) */}
                <section className="main-stage overflow-y-auto min-h-0 border-2 border-[#333] bg-[#050505] p-2">
                     <div className="grid grid-cols-4 gap-2">
                        {/* We use PlayerGrid but pass 'others'. We might need to adjust grid cols in PlayerGrid or override classes? 
                            PlayerGrid uses `grid-cols-2` hardcoded usually? No, `GameRoom` controlled usage.
                            Wait, `PlayerGrid` is just `map`. The container grid is here.
                            User wanted 4 columns? "others avatar" box suggests small icons.
                        */}
                        <PlayerGrid players={otherPlayers} />
                     </div>
                </section>

                {/* 3. LOGS (Middle Band) */}
                <section className="h-[80px] w-full z-10">
                    <ControlPanel onlyLogs={true} />
                </section>

                {/* 4. FOOTER (Me + Actions) */}
                <footer className="h-[160px] grid grid-cols-[120px_1fr] gap-2.5 z-10">
                    {/* User Avatar (Me) */}
                    <div className="h-full">
                         <AvatarCard
                             player={mePlayer}
                             onSelect={null}
                         />
                    </div>

                    {/* Action Area */}
                    <div className="h-full">
                        <ControlPanel onlyActions={true} />
                    </div>
                </footer>
            </div>
          </div>
        </GameContext.Provider>
    );
}
