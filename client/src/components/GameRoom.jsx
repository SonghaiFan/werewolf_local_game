import React, { useState, useEffect } from 'react';
import { socket } from '../socket';
import ControlPanel from './ControlPanel';
import PlayerGrid from './PlayerGrid';
import AvatarCard from './AvatarCard';

export default function GameRoom({ roomId, myId, onExit }) {
    const [gameState, setGameState] = useState({
        phase: 'WAITING',
        players: {},
        logs: [],
        round: 0,
        me: { role: null, status: 'alive' }
    });
    
    const [selectedTarget, setSelectedTarget] = useState(null);
    const [serverIP, setServerIP] = useState(null);

    useEffect(() => {
        socket.on('server_config', ({ ip }) => {
            setServerIP(ip);
        });
        function onGameState(state) {
            setGameState(prev => ({
                ...prev,
                ...state
            }));
        }

        function onNotification(msg) {
             // You could add this to logs locally if not from server logs
             // But server adds logs to game state usually
        }

        function onSeerResult({ targetId, role }) {
             alert(`Analysis Complete: Player is ${role}`);
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
    }, []);

    // Actions
    const handleStartGame = () => {
        socket.emit('start_game', { roomId });
    };

    const handleNightAction = () => {
        if (!selectedTarget) {
            alert("Select a target first!");
            return;
        }
        
        let type = 'kill'; // default wolf
        if (gameState.me.role === 'SEER') type = 'check';
        
        socket.emit('night_action', { 
            roomId, 
            action: { type, targetId: selectedTarget } 
        });
        
        // Optimistic UI or wait for update?
        setSelectedTarget(null);
    };

    const handleWitchAction = (type) => {
        // For 'save', target is implied from state (wolf target) usually, 
        // but here we might need manual selection if simple logic.
        // Logic in back: save targetId is from `wolfTarget`.
        // Poison requires selection.
        
        if (type === 'poison' && !selectedTarget) {
             alert("Select a target to poison!");
             return;
        }
        
        socket.emit('night_action', {
            roomId,
            action: { type, targetId: selectedTarget }
        });
        setSelectedTarget(null);
    };

    const handleDayVote = () => {
        if (gameState.phase !== 'DAY_VOTE') {
            alert("Voting is not open yet!");
            return;
        }
        if (!selectedTarget) return;
        
        socket.emit('day_vote', { roomId, targetId: selectedTarget });
    };
    
    const handlePlayerReady = () => {
        socket.emit('player_ready', { roomId });
    };

    const handleResolvePhase = () => {
        socket.emit('resolve_phase', { roomId });
    };

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



    const mePlayer = gameState.players[myId] || { ...gameState.me, name: 'YOU', id: myId, avatar: 1 };
    const otherPlayers = Object.values(gameState.players).filter(p => p.id !== myId);

    const amISheriff = gameState.players[myId]?.isSheriff || false;

    // ControlPanel props object for reuse
    const ControlPanelProps = {
        roomId, serverIP, logs: gameState.logs, phase: gameState.phase,
        role: gameState.me?.role, myStatus: gameState.me?.status, election: gameState.election,
        isReady: gameState.players[myId]?.isReady || false,
        speaking: gameState.speaking, // Pass speaking state
        executedId: gameState.executedId, // Pass executed ID
        myId, // Pass my ID
        amISheriff, // Pass explicit Sheriff status
        players: gameState.players, 
        isHost: gameState.hostId === myId,
        actions: {
            onStartGame: () => socket.emit('start_game', { roomId }),
            onPlayerReady: () => socket.emit('player_ready', { roomId }),
            onNightAction: () => {
                if (selectedTarget) {
                    // For Wolf/Seer, type is implied by role, but passing 'kill'/'check' doesn't hurt if backend checks it.
                    // Actually, backend might rely on type.
                    // Wolf -> kill, Seer -> check.
                    // Let's deduce type or send generic and let backend switch? 
                    // Current Server `NightManager` checks `action.type`.
                    // So we MUST send `type`.
                    // Since this callback is used for "Primary Action", let's depend on Role?
                    // But we don't have role explicitly inside closure easily (it's in props).
                    // Actually we do: `gameState.me.role`.
                    
                    const role = gameState.me?.role;
                    let type = 'kill'; // default
                    if (role === 'SEER') type = 'check';
                    // Witch doesn't use this generic handler usually, uses onWitchAction.
                     
                    socket.emit('night_action', { roomId, action: { type, targetId: selectedTarget } });
                    setSelectedTarget(null);
                } else {
                    alert("Select a target first!");
                }
            },
            onWitchAction: (type) => { // type: 'save' | 'poison' | 'skip'
                 if (type === 'poison' && !selectedTarget) {
                     alert("Select a target to poison!");
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
                    alert("Select a player to vote for!");
                }
            },
            onResolvePhase: handleResolvePhase,
            onSkipTurn: () => setSelectedTarget(null),
            onEndSpeech: () => socket.emit('end_speech', { roomId }),
            onPlayAgain: () => socket.emit('play_again', { roomId })
        }
    };

    return (
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
                            ROOM: {roomId} // R: {gameState.round}
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
                        <PlayerGrid 
                            players={otherPlayers} 
                            myId={myId} 
                            selectedId={selectedTarget}
                            onSelect={setSelectedTarget}
                            phase={gameState.phase}
                            hostId={gameState.hostId}
                        />
                     </div>
                </section>

                {/* 3. LOGS (Middle Band) */}
                <section className="h-[80px] w-full z-10">
                    <ControlPanel {...ControlPanelProps} onlyLogs={true} />
                </section>

                {/* 4. FOOTER (Me + Actions) */}
                <footer className="h-[160px] grid grid-cols-[120px_1fr] gap-2.5 z-10">
                    {/* User Avatar (Me) */}
                    <div className="h-full">
                         <AvatarCard
                             player={mePlayer}
                             myId={myId}
                             phase={gameState.phase}
                             hostId={gameState.hostId}
                             // Disable interaction for self
                             onSelect={null} 
                         />
                    </div>

                    {/* Action Area */}
                    <div className="h-full">
                        <ControlPanel {...ControlPanelProps} onlyActions={true} />
                    </div>
                </footer>
            </div>
        </div>
    );
}
