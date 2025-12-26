import React, { useState, useEffect } from 'react';
import { socket } from '../socket';
import '../Werewolf.css';
import Sidebar from './Sidebar';
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

    useEffect(() => {
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
        if (!selectedTarget) return;
        socket.emit('day_vote', { roomId, targetId: selectedTarget });
    };

    const handleResolvePhase = () => {
        socket.emit('resolve_phase', { roomId });
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
            
            <div className="photostat-root">
                <div className="scanline"></div>
                <div className="photocopy-texture"></div>

                {/* GAME AREA */}
                <section className="game-view">
                    <header className="game-header">
                        <div className="status-tag">Phase: {gameState.phase} // Day {gameState.round}</div>
                        <h1 className="game-title glitch-text">WERE<br/>WOLF</h1>
                        <div style={{ marginTop: '10px', fontFamily: 'Space Mono', fontSize: '12px' }}>
                             ID: {roomId} <br/>
                             ROLE: {gameState.me?.role || '...'}
                        </div>
                    </header>

                    <PlayerGrid 
                        players={gameState.players} 
                        myId={myId} 
                        selectedId={selectedTarget}
                        onSelect={setSelectedTarget}
                        phase={gameState.phase}
                    />
                </section>

                {/* SIDEBAR */}
                <Sidebar 
                    logs={gameState.logs} 
                    phase={gameState.phase}
                    role={gameState.me?.role}
                    myStatus={gameState.me?.status}
                    actions={{
                        onStartGame: handleStartGame,
                        onNightAction: handleNightAction,
                        onWitchAction: handleWitchAction,
                        onDayVote: handleDayVote,
                        onResolvePhase: handleResolvePhase,
                        onSkipTurn: () => setSelectedTarget(null)
                    }}
                />
            </div>
        </div>
    );
}

