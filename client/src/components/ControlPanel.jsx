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
        witch: true
    });
    
    const playerCount = players ? Object.keys(players).length : 0;
    const allReady = players ? Object.values(players).every(p => p.isReady) : false;

    // Auto-scroll logs
    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [logs]);



    const renderActions = () => {
        if (phase === 'FINISHED') {
            const winner = gameState.winner;
            const isVillagersWin = winner === 'VILLAGERS';
            
            // Construct message
            const winnerName = isVillagersWin ? t('roles.VILLAGER') : t('roles.WOLF');
            
            return (
                <div className="flex flex-col items-center justify-center h-full w-full animate-in zoom-in duration-300 gap-4">
                    <div className={`p-6 rounded-xl text-center shadow-lg ${isVillagersWin ? 'bg-success/20 text-success border border-success/30' : 'bg-danger/20 text-danger border border-danger/30'}`}>
                        <div className="text-xs font-bold uppercase mb-2 tracking-widest">{t('game_over')}</div>
                        <div className="text-2xl font-bold uppercase">
                            {winnerName} {t('win')}!
                        </div>
                    </div>
                    
                    {isHost && (
                        <button className="btn-primary w-auto px-8" onClick={actions.onPlayAgain}>
                            {t('play_again')}
                        </button>
                    )}
                    {!isHost && <div className="text-sm text-text-secondary">{t('waiting_for_host')}</div>}
                </div>
            );
       }

        // Special Case: If it's your Last Words (DAY_LEAVE_SPEECH) and you are the one executed,
        // you are likely 'dead' but still need to act.
        const isMyLastWords = phase === 'DAY_LEAVE_SPEECH' && executedId === myId;
        
        if (myStatus === 'dead' && !isMyLastWords) {
             return <div className="mt-auto"><button className="btn-secondary opacity-50 cursor-not-allowed w-full" disabled>{t('you_are_dead')}</button></div>;
        }

        if (phase === 'WAITING') {
             // Smart Host Detection: If on localhost, use discovered LAN IP from server
             const hostname = window.location.hostname;
             const effectiveHost = (serverIP && (hostname === 'localhost' || hostname === '127.0.0.1')) 
                ? serverIP 
                : hostname;
             
             const joinUrl = `${window.location.protocol}//${effectiveHost}:${window.location.port}/?room=${roomId}`;
             
             return (
                 <div className="mt-auto flex flex-col gap-3">
                     {showQRCode && (
                        <div className="absolute inset-0 bg-surface/95 backdrop-blur z-50 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
                            <div className="text-accent font-bold mb-6 text-lg tracking-wide">{t('scan_to_join')}</div>
                            <div className="bg-white p-4 rounded-xl shadow-2xl">
                                <QRCodeSVG value={joinUrl} size={160} level="H" />
                            </div>
                            <div className="font-mono text-xs text-text-secondary mt-6 break-all bg-black/20 px-3 py-1 rounded">
                                {joinUrl}
                            </div>
                            <button 
                                className="mt-6 btn-secondary w-full max-w-xs"
                                onClick={() => setShowQRCode(false)}
                            >
                                {t('close')}
                            </button>
                        </div>
                     )}

                     {/* Ready Toggle - Only for non-host */}
                     {!isHost && (
                         <button 
                             className={`w-full py-3 rounded-lg font-medium transition-all ${isReady ? 'bg-surface text-text-secondary border border-white/5' : 'btn-primary animate-pulse'}`} 
                             onClick={actions.onPlayerReady}
                         >
                             {isReady ? t('waiting_for_others') : t('click_when_ready')}
                         </button>
                     )}

                     {/* Host Start Button & Settings */}
                     {isHost && (
                        <div className="pt-3 border-t border-white/5">
                             {(() => {
                                 const canStart = players && Object.values(players).every(p => p.id === myId || p.isReady);
                                 
                                 return (
                                    <div className="w-full">
                                         {/* Simple Settings Toggle */}
                                         <div className="mb-3 flex items-center justify-between text-xs text-text-secondary">
                                             <span className="uppercase tracking-wider font-bold">{t('settings')}</span>
                                             <button 
                                                 className={`w-6 h-6 flex items-center justify-center rounded-full transition-colors ${showSettings ? 'bg-white text-black' : 'bg-surface hover:bg-surface-hover text-text-secondary'}`}
                                                 onClick={() => setShowSettings(!showSettings)}
                                             >
                                                 {showSettings ? '−' : '+'}
                                             </button>
                                         </div>

                                         {showSettings && (
                                              <div className="mb-3 p-3 bg-white/5 rounded-lg text-xs border border-white/5 space-y-2 animate-in slide-in-from-top-2">
                                                  <div className="flex items-center justify-between">
                                                      <label className="text-text-secondary">Wolves: {gameConfig.wolves}</label>
                                                      <div className="flex gap-2">
                                                          <button className="w-5 h-5 flex items-center justify-center bg-white/10 rounded hover:bg-white/20" onClick={() => setGameConfig(p => ({...p, wolves: Math.max(1, p.wolves - 1)}))}>−</button>
                                                          <button className="w-5 h-5 flex items-center justify-center bg-white/10 rounded hover:bg-white/20" onClick={() => setGameConfig(p => ({...p, wolves: p.wolves + 1}))}>+</button>
                                                      </div>
                                                  </div>
                                                  <div className="flex items-center gap-2">
                                                      <input 
                                                          type="checkbox" 
                                                          className="rounded border-white/20 bg-black/20 text-accent focus:ring-accent"
                                                          checked={gameConfig.seer} 
                                                          onChange={e => setGameConfig(p => ({...p, seer: e.target.checked}))}
                                                      />
                                                      <label className="text-text-secondary">Seer</label>
                                                  </div>
                                                  <div className="flex items-center gap-2">
                                                      <input 
                                                          type="checkbox" 
                                                          className="rounded border-white/20 bg-black/20 text-accent focus:ring-accent"
                                                          checked={gameConfig.witch} 
                                                          onChange={e => setGameConfig(p => ({...p, witch: e.target.checked}))}
                                                      />
                                                      <label className="text-text-secondary">Witch</label>
                                                  </div>
                                                  
                                                  <div className="pt-2 border-t border-white/10 text-text-secondary">
                                                      Villagers: {playerCount - gameConfig.wolves - (gameConfig.seer?1:0) - (gameConfig.witch?1:0)}
                                                  </div>
                                              </div>
                                         )}

                                         <button 
                                            className={`btn-primary w-full ${(!canStart || (playerCount - gameConfig.wolves - (gameConfig.seer?1:0) - (gameConfig.witch?1:0) < 0)) && 'opacity-50 cursor-not-allowed'}`}
                                            onClick={() => { 
                                                if(canStart && (playerCount - gameConfig.wolves - (gameConfig.seer?1:0) - (gameConfig.witch?1:0) >= 0)) {
                                                    actions.onStartGame(gameConfig);
                                                }
                                            }}
                                            disabled={!canStart || (playerCount - gameConfig.wolves - (gameConfig.seer?1:0) - (gameConfig.witch?1:0) < 0)}
                                        >
                                            {!canStart ? t('waiting_for_others') : t('start_game')}
                                        </button>
                                     </div>
                                 );
                             })()}
                        </div>
                     )}
                     
                     <button 
                        className="btn-ghost text-xs w-full py-2 mt-2"
                        onClick={() => setShowQRCode(true)}
                     >
                        {t('show_qr')}
                     </button>
                     <p className="mt-1 text-[10px] text-text-secondary/50 text-center uppercase tracking-widest">{t('lobby')}</p>
                 </div>
             );
        }

        // --- NIGHT PHASES ---
        
        // GENERIC NIGHT WAIT
        if (phase.startsWith('NIGHT_') && role !== 'WOLF' && role !== 'SEER' && role !== 'WITCH') {
             return (
                  <div className="mt-auto text-center p-4">
                      <div className="text-sm font-medium text-text-secondary mb-1 animate-pulse">{t('night_falls')}...</div>
                      <p className="text-xs text-text-secondary opacity-60">{t('wait_turn')}</p>
                  </div>
             );
        }

        // WOLVES
        if (phase === 'NIGHT_WOLVES') {
            if (role === 'WOLF') {
                 if (hasActed) {
                     return (
                         <div className="mt-auto">
                              <div className="text-xs font-bold mb-2 text-danger animate-pulse flex items-center gap-2">
                                 <div className="w-2 h-2 rounded-full bg-danger"></div> {t('wolf_wake')}
                              </div>
                              <button className="btn-secondary opacity-50 cursor-not-allowed w-full" disabled>{t('waiting_for_others')}</button>
                         </div>
                     );
                 }
                 return (
                      <div className="mt-auto">
                          <div className="text-xs font-bold mb-2 text-danger animate-pulse flex items-center gap-2">
                             <div className="w-2 h-2 rounded-full bg-danger"></div> {t('wolf_wake')}
                          </div>
                          <button className="btn-primary bg-danger hover:bg-danger/90 border-transparent text-white" onClick={actions.onNightAction}>{t('kill_target')}</button>
                      </div>
                 );
            }
            // Others
            return (
                  <div className="mt-auto text-center p-4">
                      <div className="text-sm font-medium text-text-secondary mb-1">{t('night_falls')}...</div>
                      <p className="text-xs text-text-secondary opacity-60">{t('wolves_hunting')}</p>
                  </div>
            );
        }

        // WITCH
        if (phase === 'NIGHT_WITCH') {
            if (role === 'WITCH') {
                 if (hasActed) {
                     return (
                        <div className="mt-auto">
                            <div className="text-xs font-bold mb-2 text-purple-400 animate-pulse flex items-center gap-2">
                               <div className="w-2 h-2 rounded-full bg-purple-400"></div> {t('witch_wake')}
                            </div>
                            <button className="btn-secondary opacity-50 cursor-not-allowed w-full" disabled>{t('waiting_for_others')}</button>
                        </div>
                     );
                 }
                 return (
                    <div className="mt-auto space-y-3">
                        <div className="text-xs font-bold mb-2 text-purple-400 animate-pulse flex items-center gap-2">
                           <div className="w-2 h-2 rounded-full bg-purple-400"></div> {t('witch_wake')}
                        </div>
                        <div className="flex flex-col gap-2">
                            <button className="btn-primary bg-purple-600 hover:bg-purple-500 border-transparent text-white" onClick={() => actions.onWitchAction('save')}>{t('save_victim')}</button>
                            <button className="btn-primary bg-purple-800 hover:bg-purple-700 border-transparent text-white" onClick={() => actions.onWitchAction('poison')}>{t('poison_target')}</button>
                            <button className="btn-secondary text-xs py-2" onClick={() => actions.onWitchAction('skip')}>{t('do_nothing')}</button>
                        </div>
                    </div>
                 );
            }
            return (
                  <div className="mt-auto text-center p-4">
                      <div className="text-sm font-medium text-text-secondary mb-1">...</div>
                      <p className="text-xs text-text-secondary opacity-60">{t('witch_active')}</p>
                  </div>
            );
        }

        // SEER
        if (phase === 'NIGHT_SEER') {
            if (role === 'SEER') {
                 if (hasActed) {
                     return (
                        <div className="mt-auto">
                            <div className="text-xs font-bold mb-2 text-accent animate-pulse flex items-center gap-2">
                               <div className="w-2 h-2 rounded-full bg-accent"></div> {t('seer_wake')}
                            </div>
                            <button className="btn-secondary opacity-50 cursor-not-allowed w-full" disabled>{t('waiting_for_others')}</button>
                        </div>
                     );
                 }
                 return (
                    <div className="mt-auto">
                        <div className="text-xs font-bold mb-2 text-accent animate-pulse flex items-center gap-2">
                           <div className="w-2 h-2 rounded-full bg-accent"></div> {t('seer_wake')}
                        </div>
                        <button className="btn-primary" onClick={actions.onNightAction}>{t('check_identity')}</button>
                    </div>
                 );
            }
            return (
                  <div className="mt-auto text-center p-4">
                      <div className="text-sm font-medium text-text-secondary mb-1">...</div>
                      <p className="text-xs text-text-secondary opacity-60">{t('seer_active')}</p>
                  </div>
            );
        }

        // --- DAY PHASES ---

        // LEAVE SPEECH (LAST WORDS)
        if (phase === 'DAY_LEAVE_SPEECH') {
             const isMeDying = executedId === myId;
             
             if (isMeDying) {
                 return (
                    <div className="mt-auto">
                        <div className="text-xs font-bold mb-2 text-danger animate-pulse flex items-center gap-2">
                           <div className="w-2 h-2 rounded-full bg-danger"></div> {t('last_words')}
                        </div>
                        <p className="text-xs text-text-secondary mb-3">{t('you_executed')}</p>
                        <button className="btn-secondary border border-danger/20 text-danger hover:bg-danger/10 w-full" onClick={actions.onEndSpeech}>{t('end_speech')}</button>
                    </div>
                 );
             }

             return (
                 <div className="mt-auto">
                     <div className="text-xs font-bold mb-2 text-danger animate-pulse flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-danger"></div> {t('execution')}
                     </div>
                     <p className="text-xs text-text-secondary">
                        {t('leaving_words', { name: players?.[executedId]?.name || 'Player' })}
                     </p>
                     
                     {/* Admin Skip */}
                     {isHost && (
                         <button 
                             className="text-[10px] text-text-secondary mt-3 underline block mx-auto hover:text-white"
                             onClick={actions.onEndSpeech}
                         >
                             {t('admin_skip')}
                         </button>
                     )}
                 </div>
             );
        }

        if (phase === 'DAY_ANNOUNCE' || phase === 'DAY_ELIMINATION') {
             return (
                 <div className="mt-auto">
                     <button className="btn-secondary opacity-50 cursor-not-allowed w-full" disabled>{t('judge_speaking')}</button>
                 </div>
             );
        }

        // DISCUSSION
        if (phase === 'DAY_DISCUSSION') {
             // Use speaking state if available, otherwise fallback
             const currentSpeakerId = speaking?.currentSpeakerId;
             const isMyTurn = currentSpeakerId === myId;
             
             // Find speaker name
             const speakerName = currentSpeakerId && players && players[currentSpeakerId] ? players[currentSpeakerId].name : t('unknown_role');

             return (
                 <div className="mt-auto">
                     <div className="text-xs font-bold mb-2 text-accent animate-pulse flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-accent"></div> {t('discussions_open')}
                     </div>
                     
                     <div className="mb-3 text-center bg-white/5 rounded-lg p-3 border border-white/5">
                        <div className="text-[10px] text-text-secondary uppercase tracking-widest mb-1">{t('current_speaker')}</div>
                        <div className={`text-sm font-bold ${isMyTurn ? 'text-accent' : 'text-text-primary'}`}>
                            {isMyTurn ? t('you') : speakerName}
                        </div>
                     </div>

                     {isMyTurn ? (
                         <button className="btn-primary w-full" onClick={actions.onEndSpeech}>
                             {t('end_speech')}
                         </button>
                     ) : (
                         <div className="text-xs text-text-secondary text-center bg-white/5 rounded-lg p-2 border border-white/5 italic">
                             {t('listening')}
                         </div>
                     )}
                     
                      <div className="mt-2.5 text-xs text-text-secondary/50 text-center">
                        {speaking?.currentSpeakerId ? 'Mic Check Active' : 'Determining order...'}
                     </div>
                     {/* Host Skip */}
                     {isHost && !isMyTurn && (
                         <button 
                             className="text-[10px] text-text-secondary mt-2 underline block mx-auto hover:text-white"
                             onClick={actions.onEndSpeech}
                         >
                             {t('admin_skip')}
                         </button>
                     )}
                 </div>
             );
        }

        if (phase === 'DAY_VOTE') {
             if (hasActed) {
                 return (
                     <div className="mt-auto">
                        <div className="text-xs font-bold mb-2 text-danger animate-pulse flex items-center gap-2">
                           <div className="w-2 h-2 rounded-full bg-danger"></div> {t('vote_required')}
                        </div>
                         <button className="btn-secondary opacity-50 cursor-not-allowed w-full" disabled>{t('waiting_for_others')}</button>
                     </div>
                 );
             }
             return (
                 <div className="mt-auto">
                    <div className="text-xs font-bold mb-2 text-danger animate-pulse flex items-center gap-2">
                       <div className="w-2 h-2 rounded-full bg-danger"></div> {t('vote_required')}
                    </div>
                     <button className="btn-primary bg-danger hover:bg-danger/90 border-transparent text-white" onClick={actions.onDayVote}>{t('confirm_vote')}</button>
                 </div>
             );
        }

        // FINISHED
        return (
            <div className="mt-auto">
                <button className="btn-secondary w-full" onClick={() => window.location.reload()}>{t('reboot')}</button>
            </div>
        );
    };

    const [showLogsMobile, setShowLogsMobile] = React.useState(false);

    // If onlyActions is true, we ONLY render the action buttons (no container styles, no logs)
    if (onlyActions) {
         return (
             <div className="flex flex-col h-full justify-end">
                  {renderActions()}
             </div>
         );
    }
    
    // If onlyLogs is true, we ONLY render the logs
    if (onlyLogs) { 
        return (
            <div className={`
                flex-grow font-mono text-[11px] list-none overflow-y-auto bg-black/40 rounded-lg p-3 h-full space-y-2
            `}>
                {logs.map((log, i) => (
                    <div key={i} className={`pb-1 border-b border-white/5 last:border-0 ${i === logs.length - 1 ? 'text-accent font-bold' : 'text-text-secondary'}`}>
                        {log}
                    </div>
                ))}
                <div ref={logsEndRef} />
            </div>
        );
    }

    // Legacy / Fallback View (Full ControlPanel)
    return (
        <aside className="border border-white/5 p-4 bg-surface rounded-xl flex flex-col relative h-full overflow-hidden shadow-lg">
            
            <div className={`
                flex-grow font-mono text-[11px] list-none overflow-y-auto bg-black/20 rounded-lg p-3 mb-4 transition-all duration-300 border border-white/5
                ${showLogsMobile ? 'h-[150px]' : 'h-0 mb-0 border-0 p-0'}
            `}>
                {logs.map((log, i) => (
                    <div key={i} className={`pb-1 border-b border-white/5 last:border-0 ${i === logs.length - 1 ? 'text-accent font-bold' : 'text-text-secondary'}`}>
                        {log}
                    </div>
                ))}
                <div ref={logsEndRef} />
            </div>
            
            {renderActions()}

            {/* Admin/Debug Resolve Button (Still kept for manual override if needed) */}
            <div className="mt-4 pt-3 border-t border-white/5 opacity-30 hover:opacity-100 transition-opacity">
               <button 
                  onClick={actions.onResolvePhase} 
                  className="w-full text-[9px] text-text-secondary uppercase tracking-widest hover:text-white"
               >
                  [ADMIN] FORCE RESOLVE
               </button>
            </div>
        </aside>
    );
}
