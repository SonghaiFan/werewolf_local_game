import React, { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

export default function ControlPanel(props) {
    const { roomId, serverIP, logs, phase, role, myStatus, election, isReady, players, isHost, actions, speaking, myId, executedId, amISheriff } = props;
    const logsEndRef = useRef(null);
    const [showQRCode, setShowQRCode] = useState(false);
    
    const playerCount = players ? Object.keys(players).length : 0;
    const allReady = players ? Object.values(players).every(p => p.isReady) : false;

    // Auto-scroll logs
    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [logs]);

    // Election Vote Tracking
    const [hasVoted, setHasVoted] = useState(false);
    useEffect(() => {
        if (phase !== 'DAY_ELECTION_NOMINATION') setHasVoted(false);
    }, [phase]);

    const renderActions = () => {
        if (myStatus === 'dead') {
             return <div className="mt-auto"><button className="btn-brutal" disabled>YOU ARE DEAD</button></div>;
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
                            <div className="font-mono text-accent mb-5 text-lg">SCAN TO JOIN</div>
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
                                CLOSE
                            </button>
                        </div>
                     )}

                     {/* Ready Toggle - Only for non-host */}
                     {!isHost && (
                         <button 
                             className={`btn-brutal w-full ${isReady ? 'bg-[#333] text-[#888]' : 'bg-transparent border-white text-white animate-pulse'}`} 
                             onClick={actions.onPlayerReady}
                         >
                             {isReady ? 'WAITING FOR OTHERS...' : 'CLICK WHEN READY'}
                         </button>
                     )}

                     {/* Host Start Button */}
                     {isHost && (
                        <div className="pt-2.5 border-t border-[#333]">
                             {/* Calculated derived state for "all ready" excluding host check if host isn't marked ready yet in UI */}
                             {(() => {
                                 // Check if everyone ELSE is ready
                                 // We need to filter out the host from the ready check?
                                 // `players` is an object.
                                 const otherPlayers = players ? Object.values(players).filter(p => !p.id || (p.id !== (Object.keys(players).find(key => players[key] === p) /* Not easy to get ID if p doesn't have it? p has id from GameRoom! */))) : [];
                                 
                                 // Actually p has .id. 
                                 // We need myId to know who I am, but isHost is passed boolean.
                                 // However, we can check if `allReady` (passed prop) is "Almost All Ready".
                                 
                                 // Let's rely on the explicit check:
                                 const others = players ? Object.values(players).filter(p => !p.isHost && p.id !== (players[Object.keys(players).find(k => players[k] === p)]?.id /* wait this is messy */)) : [];
                                 // Simplified: `players` contains all. Host doesn't need to be ready.
                                 // So we check if every player WHERE id != hostId is ready.
                                 // But we don't have hostId prop directly here? We have `isHost` boolean.
                                 
                                 // Better approach:
                                 // The `allReady` var at top of component:
                                 // `const allReady = players ? Object.values(players).every(p => p.isReady) : false;`
                                 // We should update that definition or create `canStart`.
                                 
                                 // Let's redefine `allReady` at the top? No, I can't edit top level here easily without scrolling up.
                                 // I will just implement the logic inline here.
                                 const readyCount = players ? Object.values(players).filter(p => p.isReady).length : 0;
                                 const totalPlayers = players ? Object.keys(players).length : 0;
                                 // If host is not ready, allReady is false.
                                 // We want: Everyone ready OR (Everyone except Host ready).
                                 
                                 // Check unready count
                                 const unreadyCount = players ? Object.values(players).filter(p => !p.isReady).length : 0;
                                 
                                 // If I am Host and I see this, I am unready. 
                                 // So unreadyCount must be exactly 1 (Me) OR 0 (If I am somehow marked ready).
                                 const canStart = unreadyCount === 0 || (unreadyCount === 1 && !isReady);
                                 
                                 return (
                                    <div className="relative w-full">
                                         {!canStart && (
                                            <div className="absolute bottom-full left-0 w-full text-[9px] text-center mb-2 text-danger font-bold uppercase tracking-wider animate-pulse">
                                                WAITING FOR PLAYERS
                                            </div>
                                         )}
                                         <button 
                                            className={`btn-brutal bg-accent text-black w-full ${!canStart && 'opacity-50 cursor-not-allowed'}`}
                                            onClick={() => {
                                                if(canStart) actions.onStartGame();
                                                else alert("Wait for all players to be READY!");
                                            }}
                                        >
                                            START GAME
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
                        SHOW JOIN QR CODE
                     </button>
                     <p className="mt-2 text-xs text-[#666] text-center">LOBBY // WAITING FOR PLAYERS</p>
                 </div>
             );
        }

        // --- NIGHT PHASES ---
        
        // ... (Rest of NIGHT PHASES code logic remains same, just ensuring no syntax breaks)
        // WOLVES
        if (phase === 'NIGHT_WOLVES') {
            if (role === 'WOLF') {
                 return (
                     <div className="mt-auto">
                         <div className="font-mono text-[11px] mb-2.5 text-danger animate-pulse">
                            &gt;&gt; WAKE UP. CHOOSE A VICTIM.
                         </div>
                         <button className="btn-brutal" onClick={actions.onNightAction}>KILL TARGET</button>
                     </div>
                 );
            }
            // Others
            return (
                 <div className="mt-auto">
                     <button className="btn-brutal opacity-50" disabled>NIGHT FALLS...</button>
                     <p className="mt-2.5 text-xs text-[#666]">Wolves are hunting.</p>
                 </div>
            );
        }

        // WITCH
        if (phase === 'NIGHT_WITCH') {
            if (role === 'WITCH') {
                 return (
                    <div className="mt-auto">
                        <div className="font-mono text-[11px] mb-2.5 text-accent animate-pulse">
                           &gt;&gt; WAKE UP. POTION READY.
                        </div>
                        <div className="flex flex-col gap-2.5">
                            <button className="btn-brutal" onClick={() => actions.onWitchAction('save')}>SAVE VICTIM</button>
                            <button className="btn-brutal bg-[#a020f0]" onClick={() => actions.onWitchAction('poison')}>POISON TARGET</button>
                            <button className="flex-1 p-2.5 bg-[#222] border border-[#444] text-white font-mono text-[10px] cursor-pointer hover:bg-[#333]" onClick={() => actions.onWitchAction('skip')}>DO NOTHING</button>
                        </div>
                    </div>
                 );
            }
            return (
                 <div className="mt-auto">
                     <button className="btn-brutal opacity-50" disabled>SLEEPING...</button>
                     <p className="mt-2.5 text-xs text-[#666]">Witch is active.</p>
                 </div>
            );
        }

        // SEER
        if (phase === 'NIGHT_SEER') {
            if (role === 'SEER') {
                 return (
                    <div className="mt-auto">
                        <div className="font-mono text-[11px] mb-2.5 text-accent animate-pulse">
                           &gt;&gt; WAKE UP. REVEAL TRUTH.
                        </div>
                        <button className="btn-brutal" onClick={actions.onNightAction}>CHECK IDENTITY</button>
                    </div>
                 );
            }
            return (
                 <div className="mt-auto">
                     <button className="btn-brutal opacity-50" disabled>SLEEPING...</button>
                     <p className="mt-2.5 text-xs text-[#666]">Seer is active.</p>
                 </div>
            );
        }

        // --- DAY PHASES ---

        // ELECTION NOMINATION
        if (phase === 'DAY_ELECTION_NOMINATION') {

             return (
                 <div className="mt-auto">
                     <div className="font-mono text-[11px] mb-2.5 text-accent animate-pulse">
                        &gt;&gt; ELECTION: RUN FOR SHERIFF?
                     </div>
                     
                     {!hasVoted ? (
                         <>
                            <p className="text-xs text-[#666] mb-2.5">All alive players must choose.</p>
                            <div className="flex gap-2.5 mb-2.5">
                                <button className="btn-brutal bg-accent text-black flex-1" onClick={() => { setHasVoted(true); actions.onElectionNominate(); }}>RUN</button>
                                <button className="btn-brutal border-white text-white flex-1 hover:bg-[#333]" onClick={() => { setHasVoted(true); actions.onElectionPass(); }}>DECLINE</button>
                            </div>
                         </>
                     ) : (
                        <div className="text-xs text-[#666] text-center mb-2.5 animate-pulse border border-[#333] p-2.5">
                             CHOICE RECORDED. <br/> WAITING FOR OTHERS...
                        </div>
                     )}
                     
                     <div className="text-[10px] text-[#444] text-center font-mono">
                         {election?.participants?.length || 0} players decided.
                     </div>
                 </div>
             );
        }

        // ELECTION VOTE
        if (phase === 'DAY_ELECTION_VOTE') {
             return (
                 <div className="mt-auto">
                     <div className="font-mono text-[11px] mb-2.5 text-danger animate-pulse">
                        &gt;&gt; VOTE FOR SHERIFF
                     </div>
                     <button className="btn-brutal" onClick={actions.onDayVote}>VOTE TARGET</button>
                      <button 
                        className="flex-1 p-2.5 mt-2.5 w-full bg-[#222] border border-[#444] text-white font-mono text-[10px] cursor-pointer"
                        onClick={actions.onResolvePhase}
                     >
                        [ADMIN] END ELECTION
                     </button>
                 </div>
             );
        }

        // LEAVE SPEECH (LAST WORDS)
        if (phase === 'DAY_LEAVE_SPEECH') {
             const isMeDying = executedId === myId;
             const victimName = executedId && players && players[executedId] ? players[executedId].name : 'Victim';
             
             return (
                 <div className="mt-auto">
                     <div className="font-mono text-[11px] mb-2.5 text-accent animate-pulse">
                        &gt;&gt; LAST WORDS
                     </div>
                     <div className="text-xs text-[#666] mb-2.5 text-center">
                        {isMeDying ? "You have been executed. Leave your last words." : `${victimName} is leaving their last words.`}
                     </div>

                     {isMeDying ? (
                        <button 
                            className="btn-brutal w-full mt-2.5 bg-accent text-black"
                            onClick={actions.onEndSpeech}
                        >
                            END MY SPEECH
                        </button>
                     ) : (
                         <div className="text-[10px] text-[#444] text-center border border-[#333] p-1">
                             LISTENING...
                         </div>
                     )}
                     
                     {/* Admin Override if stuck */}
                     {isHost && !isMeDying && (
                         <button 
                             className="text-[9px] text-[#444] mt-2 underline block mx-auto hover:text-white"
                             onClick={actions.onEndSpeech}
                         >
                             (Admin Force Skip)
                         </button>
                     )}
                 </div>
             );
        }

        if (phase === 'DAY_ANNOUNCE' || phase === 'DAY_ELIMINATION') {
             return (
                 <div className="mt-auto">
                     <button className="btn-brutal" disabled>JUDGE SPEAKING...</button>
                 </div>
             );
        }

        // DISCUSSION
        if (phase === 'DAY_DISCUSSION') {
             // Use speaking state if available, otherwise fallback
             const currentSpeakerId = props.speaking?.currentSpeakerId;
             const isMyTurn = currentSpeakerId === props.myId;
             
             // Find speaker name
             const speakerName = currentSpeakerId && props.players && props.players[currentSpeakerId] ? props.players[currentSpeakerId].name : 'Unknown';

             return (
                 <div className="mt-auto">
                     <div className="font-mono text-[11px] mb-2.5 text-accent animate-pulse">
                        &gt;&gt; DISCUSSIONS OPEN
                     </div>
                     
                     {currentSpeakerId ? (
                         <div className="mb-2.5 p-2.5 border border-[#333] bg-[#111]">
                            <div className="text-[9px] text-[#666] uppercase mb-1">CURRENT SPEAKER</div>
                            <div className="font-bold text-lg text-white">{speakerName}</div>
                         </div>
                     ) : (
                         <div className="text-xs text-[#666] mb-2.5">Preparing speaking order...</div>
                     )}

                     {isMyTurn ? (
                         <button className="btn-brutal bg-accent text-black animate-pulse" onClick={actions.onEndSpeech}>
                             END SPEECH
                         </button>
                     ) : (
                         <button className="btn-brutal opacity-50 cursor-not-allowed" disabled>
                             WAITING FOR TURN...
                         </button>
                     )}
                     
                      <div className="mt-2.5 text-xs text-[#666]">
                        {props.speaking?.currentSpeakerId ? 'Listen explicitly.' : 'Judge is determining order...'}
                     </div>
                 </div>
             );
        }

        // SHERIFF SPEECH
        if (phase === 'DAY_SHERIFF_SPEECH') {
             return (
                 <div className="mt-auto">
                     <div className="font-mono text-[11px] mb-2.5 text-accent animate-pulse">
                        &gt;&gt; SHERIFF SUMMARY
                     </div>
                     <button className="btn-brutal opacity-50 w-full cursor-not-allowed" disabled>SHERIFF IS SPEAKING...</button>
                     <div className="mt-2.5 text-xs text-[#666]">
                        Please wait for voting.
                     </div>
                 </div>
             );
        }

        // SHERIFF HANDOVER
        // SHERIFF HANDOVER
        if (phase === 'DAY_SHERIFF_HANDOVER') {
             // Only show controls for the dying Sheriff
             if (!amISheriff) {
                 return (
                     <div className="mt-auto">
                        <div className="font-mono text-[11px] mb-2.5 text-danger animate-pulse">
                            &gt;&gt; SHERIFF DIED
                        </div>
                        <p className="text-xs text-[#666]">Waiting for Sheriff to decide...</p>
                     </div>
                 );
             }

            return (
                 <div className="mt-auto">
                     <div className="font-mono text-[11px] mb-2.5 text-danger animate-pulse">
                        &gt;&gt; SHERIFF DIED
                     </div>
                     <p className="text-xs text-[#666] mb-2.5">Choose successor or tear badge.</p>
                     
                     <div className="flex flex-col gap-2.5">
                        <button className="btn-brutal bg-accent text-black" onClick={() => actions.onSheriffHandover(null)}>TEAR BADGE</button>
                        <button className="btn-brutal" onClick={() => actions.onSheriffHandover('USE_SELECTED')}>PASS TO SELECTED</button>
                     </div>
                 </div>
             );
        }

        if (phase === 'DAY_VOTE') {
             return (
                 <div className="mt-auto">
                     <div className="font-mono text-[11px] mb-2.5 text-danger animate-pulse">
                        &gt;&gt; VOTE FOR ELIMINATION
                     </div>
                     <button className="btn-brutal" onClick={actions.onDayVote}>CONFIRM VOTE</button>
                 </div>
             );
        }

        // FINISHED
        return (
            <div className="mt-auto">
                <button className="btn-brutal btn-start" onClick={() => window.location.reload()}>REBOOT SYSTEM</button>
            </div>
        );
    };

    const [showLogsMobile, setShowLogsMobile] = React.useState(false);

    // If onlyActions is true, we ONLY render the action buttons (no container styles, no logs)
    if (props.onlyActions) {
         return (
             <div className="flex flex-col h-full justify-end bg-black border-t-2 border-ink p-2.5">
                  {renderActions()}
             </div>
         );
    }
    
    // If onlyLogs is true, we ONLY render the logs
    if (props.onlyLogs) { 
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
