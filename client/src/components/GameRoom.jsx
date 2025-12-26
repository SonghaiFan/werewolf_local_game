import React, { useState, useEffect } from 'react';
import { socket } from '../socket';
import ControlPanel from './ControlPanel';
import PlayerGrid from './PlayerGrid';

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
        if (gameState.phase !== 'DAY_VOTE' && gameState.phase !== 'DAY_ELECTION_VOTE') {
            alert("Voting is not open yet!");
            return;
        }
        if (!selectedTarget) return;
        
        if (gameState.phase === 'DAY_ELECTION_VOTE') {
            socket.emit('election_vote', { roomId, targetId: selectedTarget });
        } else {
            socket.emit('day_vote', { roomId, targetId: selectedTarget });
        }
    };

    const handleElectionNominate = () => {
        socket.emit('election_nominate', { roomId });
    };

    const handleElectionPass = () => {
        socket.emit('election_pass', { roomId });
    };
    
    const handlePlayerReady = () => {
        socket.emit('player_ready', { roomId });
    };

    const handleSheriffHandover = (val) => {
        let targetId = val;
        if (val === 'USE_SELECTED') {
            if (!selectedTarget) {
                 alert("Select a player on the grid first!");
                 return;
            }
            targetId = selectedTarget;
        }
        // targetId null = Tear
        socket.emit('sheriff_handover', { roomId, targetId });
    };

    const handleResolvePhase = () => {
        socket.emit('resolve_phase', { roomId });
    };

    // Voice Judge Effect
    useEffect(() => {
        function onVoiceCue({ text }) {
             // Only Host plays audio
             // We need to know who host is. 
             // Backend sends hostId in game_state.
             if (gameState.hostId === myId) {
                 const utterance = new SpeechSynthesisUtterance(text);
                 utterance.rate = 0.9;
                 utterance.pitch = 0.8; // Lower pitch for authority
                 // utterance.voice = ... (could pick specific voice)
                 window.speechSynthesis.speak(utterance);
             }
        }
        socket.on('voice_cue', onVoiceCue);
        return () => socket.off('voice_cue', onVoiceCue);
    }, [gameState.hostId, myId]);

    const mePlayer = gameState.players[myId] || { ...gameState.me, name: 'YOU', id: myId, avatar: 1 };
    const otherPlayers = Object.values(gameState.players).filter(p => p.id !== myId);

    // ControlPanel props object for reuse
    const ControlPanelProps = {
        roomId, serverIP, logs: gameState.logs, phase: gameState.phase,
        role: gameState.me?.role, myStatus: gameState.me?.status, election: gameState.election,
        isReady: gameState.players[myId]?.isReady || false,
        players: gameState.players, 
        isHost: gameState.hostId === myId,
        actions: {
            onStartGame: handleStartGame,
            onPlayerReady: handlePlayerReady,
            onNightAction: handleNightAction,
            onWitchAction: handleWitchAction,
            onDayVote: handleDayVote,
            onElectionNominate: handleElectionNominate,
            onElectionPass: handleElectionPass,
            onSheriffHandover: handleSheriffHandover,
            onResolvePhase: handleResolvePhase,
            onSkipTurn: () => setSelectedTarget(null)
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
            
            <div className="photostat-root relative w-full h-full p-2 grid grid-rows-[auto_1fr_auto_auto] gap-2.5 contrast-125 brightness-110 z-10 max-w-lg mx-auto border-x-0 md:border-x border-[#333]">
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
                    <ControlPanel {...ControlPanelProps} actions={{...ControlPanelProps.actions, onlyLogs: true}} />
                </section>

                {/* 4. FOOTER (Me + Actions) */}
                <footer className="h-[160px] grid grid-cols-[120px_1fr] gap-2.5 z-10">
                    {/* User Avatar (Me) */}
                    <div className="bg-accent text-black border-2 border-black p-2 flex flex-col justify-between relative overflow-hidden">
                         <div className="font-mono text-2xl font-bold leading-none">YOU</div>
                         <div className="text-4xl text-center my-auto">
                            {/* Simple Avatar or Role Icon */}
                            {mePlayer.role === 'WOLF' ? '🐺' : 
                             mePlayer.role === 'WITCH' ? '🧪' : 
                             mePlayer.role === 'SEER' ? '🔮' : '👤'}
                         </div>
                         <div className="font-mono text-[10px] uppercase border-t border-black pt-1 flex justify-between">
                            <span>{mePlayer.role || '???'}</span>
                            <span>{mePlayer.status === 'dead' ? 'DEAD' : 'ALIVE'}</span>
                         </div>
                    </div>

                    {/* Action Area */}
                    <div className="h-full">
                        <ControlPanel {...ControlPanelProps} actions={{...ControlPanelProps.actions, onlyActions: true}} />
                    </div>
                </footer>
            </div>
        </div>
    );
}

