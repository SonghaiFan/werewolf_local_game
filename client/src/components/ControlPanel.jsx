import React, { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useTranslation } from 'react-i18next';
import { useGameContext } from '../context/GameContext';

export default function ControlPanel({ onlyActions = false, onlyLogs = false }) {
    const { t } = useTranslation();
    const { 
        roomId, 
        gameState,
        actions,
        myId,
        executedId,
        onExit,
        hostId,
        serverIP
    } = useGameContext();

    const { phase, players, logs, speaking } = gameState;
    const role = gameState.me?.role;
    const myStatus = gameState.me?.status;
    const hasActed = gameState.me?.hasActed;
    const isHost = hostId === myId;
    const isReady = players && players[myId] && players[myId].isReady;

    const logsEndRef = useRef(null);
    const [showQRCode, setShowQRCode] = useState(false);
    
    // Host Settings State
    const [showSettings, setShowSettings] = useState(false);
    const [gameConfig, setGameConfig] = useState({
        wolves: 2,
        seer: true,
        witch: true,
        guard: true,
        hunter: true,
        winCondition: 'wipeout'
    });
    
    const playerCount = players ? Object.keys(players).length : 0;
    const allReady = players ? Object.values(players).every(p => p.isReady) : false;

    // Auto-scroll logs
    // Auto-scroll logs
    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [logs]);

    // Sync config from server state
    useEffect(() => {
        if(gameState.config) {
             setGameConfig(prev => ({
                 ...prev,
                 ...gameState.config
             }));
        }
    }, [gameState.config]);

    const renderActions = () => {
        if (phase === 'FINISHED') {
            const winner = gameState.winner;
            const isVillagersWin = winner === 'VILLAGERS';
            const winnerName = isVillagersWin ? t('roles.VILLAGER') : t('roles.WOLF');
            
            return (
                <div className="flex flex-col items-center justify-center animate-in overflow-hidden">
                    <div className={`w-full p-6 rounded-[var(--radius-lg)] mb-4 text-center border bg-surface/50 backdrop-blur-sm ${isVillagersWin ? 'border-primary/20 text-ink' : 'border-danger/20 text-ink'}`}>
                        <div className="text-xs font-bold uppercase mb-2 tracking-widest opacity-60">{t('game_over')}</div>
                        <div className={`text-4xl font-black tracking-tighter ${isVillagersWin ? 'text-primary' : 'text-danger'}`}>
                            {winnerName}
                        </div>
                        <div className="text-sm tracking-widest uppercase mt-1 opacity-80">{t('win')}</div>
                    </div>
                    
                    <div className="w-full flex flex-col gap-2">
                        {isHost && (
                            <button className="btn-primary w-full shadow-xl" onClick={actions.onPlayAgain}>
                                {t('play_again')}
                            </button>
                        )}
                        <button className="btn-secondary w-full" onClick={onExit}>
                            {t('back_to_menu', 'Back to Home')}
                        </button>
                    </div>
                </div>
            );
       }

        const isMyLastWords = phase === 'DAY_LEAVE_SPEECH' && executedId === myId;
        const isMyHunterTurn = phase === 'DAY_HUNTER_DECIDE' && gameState.hunterDeadId === myId;
        
        if (myStatus === 'dead' && !isMyLastWords && !isMyHunterTurn) {
             return <div className="mt-auto"><button className="btn-secondary opacity-50 cursor-not-allowed bg-transparent border-dashed" disabled>{t('you_are_dead')}</button></div>;
        }

        if (phase === 'GAME_START') {
             return (
                 <div className="mt-auto p-4 bg-surface/20 rounded-[var(--radius-lg)] border border-white/5 backdrop-blur-sm text-center animate-in">
                    <div className="font-mono text-[10px] mb-2 text-muted opacity-60 uppercase tracking-[0.2em]">{t('game_start', 'GAME STARTING')}</div>
                    <p className="text-sm text-white/90 font-medium">{t('please_confirm_identity', 'Please check your role')}</p>
                 </div>
             );
        }

        if (phase === 'NIGHT_START') {
             return (
                 <div className="mt-auto p-4 bg-surface/20 rounded-[var(--radius-lg)] border border-white/5 backdrop-blur-sm text-center animate-in">
                    <div className="font-mono text-[10px] mb-2 text-muted opacity-60 uppercase tracking-[0.2em]">{t('night_falls')}</div>
                    <p className="text-sm text-white/90 font-medium animate-pulse">{t('close_eyes', 'Please close your eyes')}</p>
                 </div>
             );
        }

        if (phase === 'WAITING') {
             const hostname = window.location.hostname;
             const effectiveHost = (serverIP && (hostname === 'localhost' || hostname === '127.0.0.1')) 
                ? serverIP 
                : hostname;
             
             const joinUrl = `${window.location.protocol}//${effectiveHost}:${window.location.port}/?room=${roomId}`;
             
             return (
                 <div className="mt-auto flex flex-col gap-3">
                     {showQRCode && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6 animate-in">
                             <div className="bg-surface p-6 rounded-[var(--radius-lg)] border border-border shadow-2xl max-w-sm w-full relative">
                                <button className="absolute top-4 right-4 text-muted hover:text-white" onClick={() => setShowQRCode(false)}>✕</button>
                                <div className="font-bold text-white mb-6 text-center text-lg">{t('scan_to_join')}</div>
                                <div className="bg-white p-4 rounded-xl shadow-inner mx-auto w-fit">
                                    <QRCodeSVG value={joinUrl} size={180} level="H" />
                                </div>
                                <div className="font-mono text-[10px] text-muted mt-5 text-center bg-black/30 p-2 rounded break-all select-all">
                                    {joinUrl}
                                </div>
                            </div>
                        </div>
                     )}

                     {/* Ready Toggle - Only for non-host */}
                     {!isHost && (
                         <button 
                             className={`btn-primary w-full transition-all duration-500 ${isReady ? 'bg-surface text-muted border-transparent shadow-none' : 'shadow-[0_0_30px_-5px_rgba(99,102,241,0.4)] animate-pulse-slow'}`} 
                             onClick={actions.onPlayerReady}
                         >
                             {isReady ? t('waiting_for_others') : t('click_when_ready')}
                         </button>
                     )}

                     {/* Host Start Button & Settings */}
                     {isHost && (
                        <div className="pt-2">
                             {(() => {
                                 const canStart = players && Object.values(players).every(p => p.id === myId || p.isReady);
                                 
                                 return (
                                     <div className="w-full space-y-3">
                                         {/* Simple Settings Toggle */}
                                         <div className="flex items-center justify-end px-1">
                                             <button 
                                                 className={`text-[10px] uppercase tracking-wider font-bold transition-colors ${showSettings ? 'text-white' : 'text-muted hover:text-white'}`}
                                                 onClick={() => setShowSettings(!showSettings)}
                                             >
                                                 {showSettings ? 'Hide Settings' : 'Settings'}
                                             </button>
                                         </div>

                                         {showSettings && (
                                             <div className="mb-4 p-4 bg-surface/30 backdrop-blur-md rounded-xl border border-white/5 text-xs animate-in">
                                                 <div className="flex items-center justify-between mb-4">
                                                     <label className="text-muted font-medium">Wolves</label>
                                                     <div className="flex items-center bg-black/20 rounded-lg p-1">
                                                         <button className="w-6 h-6 flex items-center justify-center hover:bg-white/10 rounded text-muted" onClick={() => setGameConfig(p => ({...p, wolves: Math.max(1, p.wolves - 1)}))}>-</button>
                                                         <span className="w-6 text-center text-white font-mono">{gameConfig.wolves}</span>
                                                         <button className="w-6 h-6 flex items-center justify-center hover:bg-white/10 rounded text-muted" onClick={() => setGameConfig(p => ({...p, wolves: p.wolves + 1}))}>+</button>
                                                     </div>
                                                 </div>
                                                 <div className="flex gap-4">
                                                     <div className="flex items-center gap-2 cursor-pointer opacity-80 hover:opacity-100" onClick={() => setGameConfig(p => ({...p, seer: !p.seer}))}>
                                                         <div className={`w-3 h-3 rounded-full border ${gameConfig.seer ? 'bg-primary border-primary' : 'border-muted'}`}></div>
                                                         <label className="text-muted select-none cursor-pointer">Seer</label>
                                                     </div>
                                                     <div className="flex items-center gap-2 cursor-pointer opacity-80 hover:opacity-100" onClick={() => setGameConfig(p => ({...p, witch: !p.witch}))}>
                                                          <div className={`w-3 h-3 rounded-full border ${gameConfig.witch ? 'bg-primary border-primary' : 'border-muted'}`}></div>
                                                         <label className="text-muted select-none cursor-pointer">Witch</label>
                                                     </div>
                                                 </div>
                                                 <div className="pt-3 mt-3 border-t border-white/5">
                                                     <div className="flex rounded-md overflow-hidden border border-white/10">
                                                         <button 
                                                             className={`flex-1 py-1.5 text-[10px] font-medium transition-colors ${gameConfig.winCondition === 'side_kill' ? 'bg-primary text-white' : 'bg-transparent text-muted hover:bg-white/5'}`}
                                                             onClick={() => setGameConfig(p => ({...p, winCondition: 'side_kill'}))}
                                                         >
                                                             {t('side_kill')}
                                                         </button>
                                                         <div className="w-[1px] bg-white/10"></div>
                                                         <button 
                                                             className={`flex-1 py-1.5 text-[10px] font-medium transition-colors ${gameConfig.winCondition === 'wipeout' ? 'bg-primary text-white' : 'bg-transparent text-muted hover:bg-white/5'}`}
                                                             onClick={() => setGameConfig(p => ({...p, winCondition: 'wipeout'}))}
                                                         >
                                                             {t('wipeout')}
                                                         </button>
                                                     </div>
                                                 </div>
                                             </div>
                                         )}

                                         <button 
                                            className={`btn-primary w-full ${(!canStart) && 'opacity-50 grayscale cursor-not-allowed shadow-none'}`}
                                            onClick={() => { 
                                                if(canStart) actions.onStartGame(gameConfig);
                                            }}
                                            disabled={!canStart}
                                        >
                                            {!canStart ? t('waiting_for_others') : t('start_game')}
                                        </button>
                                     </div>
                                 );
                             })()}
                        </div>
                     )}
                     
                     <div className="flex justify-center mt-2">
                        <button 
                            className="text-[10px] text-muted/50 hover:text-white transition-colors uppercase tracking-widest"
                            onClick={() => setShowQRCode(true)}
                        >
                            {t('show_qr')}
                        </button>
                     </div>
                 </div>
             );
        }

        // --- SPECIAL PHASES / SKILLS (Dynamic Actions) ---
        if (phase.startsWith('NIGHT_') || phase === 'DAY_HUNTER_DECIDE') {
             if (hasActed) {
                 return <div className="mt-auto"><button className="btn-secondary opacity-50 cursor-not-allowed" disabled>{t('waiting_for_others')}</button></div>;
             }

             const availableActions = gameState.me?.availableActions || [];
             
             // Private Warning for Poisoned Hunter
             if (role === 'HUNTER' && gameState.me?.isPoisoned && !hasActed) {
                 return (
                    <div className="mt-auto p-4 bg-danger/10 rounded-[var(--radius-lg)] border border-danger/20 backdrop-blur-sm text-center">
                        <div className="font-mono text-[10px] mb-2 text-danger uppercase tracking-[0.2em]">{t('roles.HUNTER')}</div>
                        <p className="text-sm text-danger/80 font-medium">{t('hunter_poisoned_hint')}</p>
                    </div>
                 );
             }

             if (availableActions.length === 0) {
                 return (
                     <div className="mt-auto p-4 bg-surface/20 rounded-[var(--radius-lg)] border border-white/5 backdrop-blur-sm text-center">
                        <div className="font-mono text-[10px] mb-1 text-muted opacity-40 uppercase tracking-[0.2em]">{phase.replace(/_/g, ' ')}</div>
                        <p className="text-sm text-muted font-medium italic">{t('wait_turn')}</p>
                     </div>
                 );
             }

             const mainActions = availableActions.filter(a => a.type !== 'skip');
             const skipAction = availableActions.find(a => a.type === 'skip');

             return (
                <div className="mt-auto space-y-3">
                    <div className="text-[10px] text-primary font-bold uppercase tracking-widest mb-1 text-center opacity-60">
                        {t(`${role?.toLowerCase()}_wake`, t('identity'))}
                    </div>
                    <div className={`grid ${mainActions.length > 1 ? 'grid-cols-2' : 'grid-cols-1'} gap-3`}>
                        {mainActions.map(action => (
                            <button 
                                key={action.type}
                                className={`btn-base px-4 py-3 rounded-[var(--radius-lg)] font-medium text-sm transition-all 
                                    ${action.disabled 
                                        ? 'bg-zinc-800 text-zinc-500 border-zinc-700/30 cursor-not-allowed shadow-none opacity-50' 
                                        : 'bg-primary/10 text-primary border-primary/20 hover:bg-primary hover:text-white'}`} 
                                onClick={() => {
                                    if (!action.disabled) {
                                        actions.onAction(action.type, action.needsTarget);
                                    } else if (action.disabledReason) {
                                        alert(t(action.disabledReason));
                                    }
                                }}
                            >
                                {t(action.label)} {action.disabled ? `(${t('consumed', 'Consumed')})` : ''}
                            </button>
                        ))}
                    </div>
                    {skipAction && (
                        <button className="btn-outline w-full py-2 text-[10px] uppercase tracking-widest opacity-60 hover:opacity-100" onClick={() => actions.onAction('skip', false)}>
                            {t('do_nothing')}
                        </button>
                    )}
                </div>
             );
        }

        // --- DAY PHASES ---
        if (phase === 'DAY_LEAVE_SPEECH') {
             const isMeDying = executedId === myId;
             if (isMeDying) {
                 return (
                    <div className="mt-auto text-center">
                        <div className="text-danger font-bold uppercase tracking-widest mb-4">{t('last_words')}</div>
                        <button className="btn-primary" onClick={actions.onEndSpeech}>{t('end_speech')}</button>
                    </div>
                 );
             }
             return (
                 <div className="mt-auto text-center">
                     <div className="text-danger font-bold uppercase tracking-widest mb-2 text-xs">{t('execution')}</div>
                     <p className="text-sm text-muted mb-4">{t('leaving_words', { name: players?.[executedId]?.name || 'Player' })}</p>
                     {isHost && <button className="text-[10px] text-muted underline hover:text-white" onClick={actions.onEndSpeech}>{t('admin_skip')}</button>}
                 </div>
             );
        }

        if (phase === 'DAY_ANNOUNCE' || phase === 'DAY_ELIMINATION') {
             return <div className="mt-auto text-center text-sm text-muted animate-pulse">{t('judge_speaking')}</div>;
        }

        if (phase === 'DAY_DISCUSSION') {
             const currentSpeakerId = speaking?.currentSpeakerId;
             const isMyTurn = currentSpeakerId === myId;
             const speaker = currentSpeakerId && players ? players[currentSpeakerId] : null;
             const speakerLabel = speaker ? `${String(speaker.avatar || '0').padStart(2, '0')} 号玩家` : t('unknown_role');

             return (
                 <div className="mt-auto">
                     <div className={`p-4 rounded-[var(--radius-lg)] mb-4 text-center transition-all ${isMyTurn ? 'bg-primary/10 border-primary/20' : 'bg-surface/30 border-white/5'} border`}>
                        <div className="text-[10px] uppercase tracking-widest text-muted mb-1">{t('current_speaker')}</div>
                        <div className={`text-lg font-bold ${isMyTurn ? 'text-primary' : 'text-ink'}`}>{isMyTurn ? t('you') : speakerLabel}</div>
                     </div>

                     {isMyTurn ? (
                         <button className="btn-primary" onClick={actions.onEndSpeech}>{t('end_speech')}</button>
                     ) : (
                         <div className="text-center text-xs text-muted opacity-50">{t('listening')}</div>
                     )}
                     
                     {isHost && !isMyTurn && (
                         <div className="text-center mt-3">
                            <button className="text-[10px] text-muted underline hover:text-white" onClick={actions.onEndSpeech}>{t('admin_skip')}</button>
                         </div>
                     )}
                 </div>
             );
        }

        if (phase === 'DAY_VOTE') {
             if (hasActed) {
                 return <div className="mt-auto"><button className="btn-secondary opacity-50 cursor-not-allowed" disabled>{t('waiting_for_others')}</button></div>;
             }
             return (
                 <div className="mt-auto flex flex-col gap-2">
                     <div className="text-center text-danger font-bold uppercase tracking-widest text-xs mb-1">{t('vote_required')}</div>
                     <button className="btn-danger hover:shadow-red-500/20" onClick={actions.onDayVote}>{t('confirm_vote')}</button>
                     <button className="btn-secondary text-[10px] uppercase tracking-widest py-2" onClick={() => actions.onDayVote('abstain')}>
                        {t('abstain', 'Skip / Abstain')}
                     </button>
                 </div>
             );
        }

        return (
            <div className="mt-auto">
                <button className="btn-secondary text-xs" onClick={() => window.location.reload()}>{t('reboot')}</button>
            </div>
        );
    };

    if (onlyActions) {
         return <div className="flex flex-col h-full justify-end">{renderActions()}</div>;
    }
    
    if (onlyLogs) { 
        // Minimalist logs
        return (
            <div className="flex-grow flex flex-col justify-end font-medium text-xs list-none overflow-y-auto p-2 h-full scrollbar-hide space-y-1">
                {logs.slice(-5).map((log, i) => ( // Only show last 5 logs for 'less is more' focus
                    <div key={i} className={`text-center transition-all opacity-0 animate-in ${i === logs.slice(-5).length - 1 ? 'text-primary' : 'text-muted/60'}`} style={{animationDelay: `${i*50}ms`}}>
                        {log}
                    </div>
                ))}
                <div ref={logsEndRef} />
            </div>
        );
    }
    
    return null;
}
