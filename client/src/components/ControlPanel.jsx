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
    
    const playerCount = players ? Object.keys(players).length : 0;
    const allReady = players ? Object.values(players).every(p => p.isReady) : false;

    // Auto-scroll logs
    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [logs]);



    const renderActions = () => {
        // Special Case: If it's your Last Words (DAY_LEAVE_SPEECH) and you are the one executed,
        // you are likely 'dead' but still need to act.
        const isMyLastWords = phase === 'DAY_LEAVE_SPEECH' && executedId === myId;
        
        if (myStatus === 'dead' && !isMyLastWords) {
             return <div className="mt-auto"><button className="btn-brutal" disabled>{t('you_are_dead')}</button></div>;
        }

        if (phase === 'WAITING') {
             // Smart Host Detection: If on localhost, use discovered LAN IP from server
             const hostname = window.location.hostname;
             const effectiveHost = (serverIP && (hostname === 'localhost' || hostname === '127.0.0.1')) 
                ? serverIP 
                : hostname;
             
             const joinUrl = `${window.location.protocol}//${effectiveHost}:${window.location.port}/?room=${roomId}`;
             
             return (
                 <div className="mt-auto flex flex-col gap-2.5">
                     {showQRCode && (
                        <div className="absolute inset-0 bg-black/95 z-50 flex flex-col items-center justify-center p-5 text-center">
                            <div className="font-mono text-accent mb-5 text-lg">{t('scan_to_join')}</div>
                            <div className="bg-white p-2.5 border-2 border-accent">
                                <QRCodeSVG value={joinUrl} size={150} level="H" />
                            </div>
                            <div className="font-mono text-xs text-[#666] mt-5 break-all">
                                {joinUrl}
                            </div>
                            <button 
                                className="mt-5 btn-brutal border-white text-white hover:bg-white hover:text-black"
                                onClick={() => setShowQRCode(false)}
                            >
                                {t('close')}
                            </button>
                        </div>
                     )}

                     {/* Ready Toggle - Only for non-host */}
                     {!isHost && (
                         <button 
                             className={`btn-brutal w-full ${isReady ? 'bg-[#333] text-[#888]' : 'bg-transparent border-white text-white animate-pulse'}`} 
                             onClick={actions.onPlayerReady}
                         >
                             {isReady ? t('waiting_for_others') : t('click_when_ready')}
                         </button>
                     )}

                     {/* Host Start Button */}
                     {isHost && (
                        <div className="pt-2.5 border-t border-[#333]">
                             {(() => {
                                 // Host can start if everyone else is ready
                                 const canStart = players && Object.values(players).every(p => p.id === myId || p.isReady);
                                 
                                 return (
                                    <div className="relative w-full">
                                         <button 
                                            className={`btn-brutal bg-accent text-black w-full ${!canStart && 'opacity-50 cursor-not-allowed'}`}
                                            onClick={() => { if(canStart) actions.onStartGame(); }}
                                            disabled={!canStart}
                                        >
                                            {!canStart ? t('waiting_for_others') : t('start_game')}
                                        </button>
                                     </div>
                                 );
                             })()}
                        </div>
                     )}
                     
                     <button 
                        className="btn-brutal bg-[#222] border-[#444] text-xs py-2 hover:bg-[#333]"
                        onClick={() => setShowQRCode(true)}
                     >
                        {t('show_qr')}
                     </button>
                     <p className="mt-2 text-xs text-[#666] text-center">{t('lobby')}</p>
                 </div>
             );
        }

        // --- NIGHT PHASES ---
        
        // GENERIC NIGHT WAIT
        if (phase.startsWith('NIGHT_') && role !== 'WOLF' && role !== 'SEER' && role !== 'WITCH') {
             return (
                 <div className="mt-auto">
                    <div className="font-mono text-[11px] mb-2.5 text-[#444] animate-pulse">
                        &gt;&gt; {t('night_falls')}
                    </div>
                    <p className="text-xs text-[#666]">{t('wait_turn')}</p>
                 </div>
             );
        }

        // WOLVES
        if (phase === 'NIGHT_WOLVES') {
            if (role === 'WOLF') {
                 if (hasActed) {
                     return (
                         <div className="mt-auto">
                              <div className="font-mono text-[11px] mb-2.5 text-danger animate-pulse">
                                 &gt;&gt; {t('wolf_wake')}
                              </div>
                              <button className="btn-brutal opacity-50 cursor-not-allowed" disabled>{t('waiting_for_others')}</button>
                         </div>
                     );
                 }
                 return (
                     <div className="mt-auto">
                         <div className="font-mono text-[11px] mb-2.5 text-danger animate-pulse">
                            &gt;&gt; {t('wolf_wake')}
                         </div>
                         <button className="btn-brutal" onClick={actions.onNightAction}>{t('kill_target')}</button>
                     </div>
                 );
            }
            // Others
            return (
                 <div className="mt-auto">
                     <button className="btn-brutal opacity-50" disabled>{t('night_falls')}...</button>
                     <p className="mt-2.5 text-xs text-[#666]">{t('wolves_hunting')}</p>
                 </div>
            );
        }

        // WITCH
        if (phase === 'NIGHT_WITCH') {
            if (role === 'WITCH') {
                 if (hasActed) {
                     return (
                        <div className="mt-auto">
                            <div className="font-mono text-[11px] mb-2.5 text-accent animate-pulse">
                               &gt;&gt; {t('witch_wake')}
                            </div>
                            <button className="btn-brutal opacity-50 cursor-not-allowed" disabled>{t('waiting_for_others')}</button>
                        </div>
                     );
                 }
                 return (
                    <div className="mt-auto">
                        <div className="font-mono text-[11px] mb-2.5 text-accent animate-pulse">
                           &gt;&gt; {t('witch_wake')}
                        </div>
                        <div className="flex flex-col gap-2.5">
                            <button className="btn-brutal" onClick={() => actions.onWitchAction('save')}>{t('save_victim')}</button>
                            <button className="btn-brutal bg-[#a020f0]" onClick={() => actions.onWitchAction('poison')}>{t('poison_target')}</button>
                            <button className="flex-1 p-2.5 bg-[#222] border border-[#444] text-white font-mono text-[10px] cursor-pointer hover:bg-[#333]" onClick={() => actions.onWitchAction('skip')}>{t('do_nothing')}</button>
                        </div>
                    </div>
                 );
            }
            return (
                 <div className="mt-auto">
                     <button className="btn-brutal opacity-50" disabled>SLEEPING...</button>
                     <p className="mt-2.5 text-xs text-[#666]">{t('witch_active')}</p>
                 </div>
            );
        }

        // SEER
        if (phase === 'NIGHT_SEER') {
            if (role === 'SEER') {
                 if (hasActed) {
                     return (
                        <div className="mt-auto">
                            <div className="font-mono text-[11px] mb-2.5 text-accent animate-pulse">
                               &gt;&gt; {t('seer_wake')}
                            </div>
                            <button className="btn-brutal opacity-50 cursor-not-allowed" disabled>{t('waiting_for_others')}</button>
                        </div>
                     );
                 }
                 return (
                    <div className="mt-auto">
                        <div className="font-mono text-[11px] mb-2.5 text-accent animate-pulse">
                           &gt;&gt; {t('seer_wake')}
                        </div>
                        <button className="btn-brutal" onClick={actions.onNightAction}>{t('check_identity')}</button>
                    </div>
                 );
            }
            return (
                 <div className="mt-auto">
                     <button className="btn-brutal opacity-50" disabled>SLEEPING...</button>
                     <p className="mt-2.5 text-xs text-[#666]">{t('seer_active')}</p>
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
                        <div className="font-mono text-[11px] mb-2.5 text-danger animate-pulse">
                           &gt;&gt; {t('last_words')}
                        </div>
                        <p className="text-xs text-[#666] mb-2">{t('you_executed')}</p>
                        <button className="btn-brutal" onClick={actions.onEndSpeech}>{t('end_speech')}</button>
                    </div>
                 );
             }

             return (
                 <div className="mt-auto">
                     <div className="font-mono text-[11px] mb-2.5 text-danger animate-pulse">
                        &gt;&gt; {t('execution')}
                     </div>
                     <p className="text-xs text-[#666]">
                        {t('leaving_words', { name: players?.[executedId]?.name || 'Player' })}
                     </p>
                     
                     {/* Admin Skip */}
                     {isHost && (
                         <button 
                             className="text-[9px] text-[#444] mt-2 underline block mx-auto hover:text-white"
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
                     <button className="btn-brutal" disabled>{t('judge_speaking')}</button>
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
                     <div className="font-mono text-[11px] mb-2.5 text-accent animate-pulse">
                        &gt;&gt; {t('discussions_open')}
                     </div>
                     
                     <div className="mb-2.5 text-center">
                        <div className="text-[10px] text-[#666] mb-1">{t('current_speaker')}</div>
                        <div className={`text-sm font-bold ${isMyTurn ? 'text-accent' : 'text-white'}`}>
                            {isMyTurn ? t('you') : speakerName}
                        </div>
                     </div>

                     {isMyTurn ? (
                         <button className="btn-brutal bg-accent text-black w-full" onClick={actions.onEndSpeech}>
                             {t('end_speech')}
                         </button>
                     ) : (
                         <div className="text-xs text-[#444] text-center border border-[#333] p-2">
                             {t('listening')}
                         </div>
                     )}
                     
                      <div className="mt-2.5 text-xs text-[#666]">
                        {speaking?.currentSpeakerId ? 'Listen explicitly.' : 'Judge is determining order...'}
                     </div>
                     {/* Host Skip */}
                     {isHost && !isMyTurn && (
                         <button 
                             className="text-[9px] text-[#444] mt-2 underline block mx-auto hover:text-white"
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
                         <div className="font-mono text-[11px] mb-2.5 text-danger animate-pulse">
                            &gt;&gt; {t('vote_required')}
                         </div>
                         <button className="btn-brutal opacity-50 cursor-not-allowed" disabled>{t('waiting_for_others')}</button>
                     </div>
                 );
             }
             return (
                 <div className="mt-auto">
                     <div className="font-mono text-[11px] mb-2.5 text-danger animate-pulse">
                        &gt;&gt; {t('vote_required')}
                     </div>
                     <button className="btn-brutal" onClick={actions.onDayVote}>{t('confirm_vote')}</button>
                 </div>
             );
        }

        if (phase === 'FINISHED') {
            const winner = gameState.winner;
            const isVillagersWin = winner === 'VILLAGERS';
            const winColor = isVillagersWin ? 'text-accent' : 'text-danger';
            
            // Construct message
            // We use simple fallback if t() keys missing, but assuming they exist from context
            const winnerName = isVillagersWin ? t('roles.VILLAGER') : t('roles.WOLF');
            
            return (
                <div className="flex flex-col items-center justify-center h-full w-full animate-in zoom-in duration-300">
                    <div className={`p-5 border-4 border-current mb-4 text-center ${isVillagersWin ? 'bg-accent text-black' : 'bg-danger text-white'}`}>
                        <div className="text-sm font-mono font-bold uppercase mb-1">{t('game_over')}</div>
                        <div className="text-3xl font-black uppercase leading-none tracking-tighter">
                            {winnerName} {t('win')}!
                        </div>
                    </div>
                    
                    {isHost && (
                        <button className="btn-brutal bg-white text-black pl-8 pr-8 text-lg" onClick={actions.onPlayAgain}>
                            {t('play_again')}
                        </button>
                    )}
                    {!isHost && <div className="text-xs text-[#666]">{t('waiting_for_host')}</div>}
                </div>
            );
       }        

        // FINISHED
        return (
            <div className="mt-auto">
                <button className="btn-brutal btn-start" onClick={() => window.location.reload()}>{t('reboot')}</button>
            </div>
        );
    };

    const [showLogsMobile, setShowLogsMobile] = React.useState(false);

    // If onlyActions is true, we ONLY render the action buttons (no container styles, no logs)
    if (onlyActions) {
         return (
             <div className="flex flex-col h-full justify-end bg-black border-t-2 border-ink p-2.5">
                  {renderActions()}
             </div>
         );
    }
    
    // If onlyLogs is true, we ONLY render the logs
    if (onlyLogs) { 
        return (
            <div className={`
                flex-grow font-mono text-[13px] list-none overflow-y-auto border-y-2 border-[#333] bg-[#111] p-2.5 h-full
            `}>
                {logs.map((log, i) => (
                    <div key={i} className={`py-1 border-b border-dashed border-[#333] ${i === logs.length - 1 ? 'text-accent border-b-0' : 'text-[#888]'}`}>
                        {log}
                    </div>
                ))}
                <div ref={logsEndRef} />
            </div>
        );
    }

    // Legacy / Fallback View (Full ControlPanel)
    return (
        <aside className="border-[5px] border-ink p-5 bg-black flex flex-col relative h-full overflow-hidden">
            
            <div className={`
                flex-grow font-mono text-[13px] list-none overflow-y-auto border-b-2 border-[#333] mb-5 transition-all duration-300
                ${showLogsMobile ? 'h-[150px]' : 'h-0 border-b-0 mb-0'}
            `}>
                {logs.map((log, i) => (
                    <div key={i} className={`py-2 border-b border-dashed border-[#333] ${i === logs.length - 1 ? 'text-accent border-b-0' : 'text-[#888]'}`}>
                        {log}
                    </div>
                ))}
                <div ref={logsEndRef} />
            </div>
            
            {renderActions()}

            {/* Admin/Debug Resolve Button (Still kept for manual override if needed) */}
            <div className="mt-5 border-t border-dashed border-[#333] pt-2.5 opacity-50 hover:opacity-100">
               <button 
                  onClick={actions.onResolvePhase} 
                  className="bg-transparent border border-[#333] text-[#666] w-full text-[10px] p-[5px] cursor-pointer hover:bg-[#111]"
               >
                  [ADMIN] SKIP PHASE / FORCE RESOLVE
               </button>
            </div>
        </aside>
    );
}
