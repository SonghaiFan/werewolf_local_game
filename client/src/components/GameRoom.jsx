import React, { useState, useEffect } from 'react';
import { socket } from '../socket';
import ControlPanel from './ControlPanel';
import PlayerGrid from './PlayerGrid';
import AvatarCard from './AvatarCard';
import { useTranslation } from 'react-i18next';
import GameContext from '../context/GameContext';

export default function GameRoom({ roomId, myId, onExit, serverIP }) {
    const { t } = useTranslation();
    const [gameState, setGameState] = useState({
        phase: 'WAITING',
        players: {},
        logs: [],
        round: 0,
        me: { role: null, status: 'alive' }
    });
    
    const [selectedTarget, setSelectedTarget] = useState(null);
    // const [serverIP, setServerIP] = useState(null); // Now passed as prop
    const [inspectedPlayers, setInspectedPlayers] = useState({});

    useEffect(() => {
        // socket.on('server_config', ({ ip }) => {
        //     setServerIP(ip);
        // });
        function onGameState(state) {
            setGameState(prev => ({
                ...prev,
                ...state
            }));
        
        }

        function onNotification(msg) {
             console.log('[Notification]', msg);
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

    // Auto-clear local state when game resets
    useEffect(() => {
        if (gameState.phase === 'WAITING' || gameState.round === 0) {
             setInspectedPlayers({});
        }
    }, [gameState.phase, gameState.round]);

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
        onStartGame: (config) => {
            socket.emit('start_game', { roomId, config });
            setInspectedPlayers({});
        },
        onPlayerReady: () => socket.emit('player_ready', { roomId }),
        onSelect: (targetId) => {
            if (gameState.phase === 'NIGHT_WOLVES' && gameState.me?.role === 'WOLF') {
                // Real-time proposal sync
                socket.emit('wolf_propose', { roomId, targetId });
            }
            setSelectedTarget(targetId);
        },
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
        wolfVotes: gameState.wolfVotes, // Exposed from server
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
            {/* Background Container - Clean minimalist background */}
            <div className="absolute inset-0 bg-bg z-0 pointer-events-none"></div>

            
            <div className="relative w-full h-[100dvh] max-w-4xl mx-auto flex flex-col p-4 md:p-6 gap-4 z-10 animate-fade-in">


                {/* 1. HEADER */}
                <header className="flex justify-between items-center h-[60px] bg-surface rounded-xl px-4 border border-white/5 shadow-sm shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="bg-accent/10 text-accent font-bold p-2 rounded-lg">
                            <span className="text-sm tracking-widest uppercase">WEREWOLF</span>
                        </div>
                        <div className="h-6 w-[1px] bg-white/10"></div>
                        <div className="flex flex-col">
                            <span className="text-xs text-text-secondary uppercase tracking-wider">{t('room')}</span>
                            <span className="text-sm font-mono font-bold text-text-primary">{roomId}</span>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <div className="text-right">
                             <div className="text-xs text-text-secondary uppercase tracking-wider">{t('round_short')}</div>
                             <div className="font-mono font-bold text-text-primary">{gameState.round}</div>
                        </div>
                        <div className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-text-primary uppercase tracking-wide">
                            {gameState.phase.replace('_', ' ')}
                        </div>
                    </div>
                </header>

                {/* 2. MAIN STAGE (Others) */}
                <section className="flex-1 overflow-y-auto min-h-0 bg-surface/50 rounded-xl p-4 border border-white/5 scrollbar-hide">
                     <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                        <PlayerGrid players={otherPlayers} />
                     </div>
                </section>

                {/* 3. LOGS (Middle Band) - now integrated or cleaner */}
                <section className="h-[80px] w-full shrink-0">
                    <ControlPanel onlyLogs={true} />
                </section>

                {/* 4. FOOTER (Me + Actions) */}
                <footer className="h-[140px] grid grid-cols-[110px_1fr] gap-4 shrink-0">
                    {/* User Avatar (Me) */}
                    <div className="h-full">
                         <AvatarCard
                             player={mePlayer}
                             onSelect={null}
                             className="!min-h-full" 
                         />
                    </div>

                    {/* Action Area */}
                    <div className="h-full bg-surface rounded-xl border border-white/5 overflow-hidden">
                        <ControlPanel onlyActions={true} />
                    </div>
                </footer>
            </div>
            </div>
        </GameContext.Provider>
    );
}
