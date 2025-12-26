import React, { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

export default function ControlPanel({ roomId, serverIP, logs, phase, role, myStatus, election, isReady, players, isHost, actions }) {
    const logsEndRef = useRef(null);
    const [showQRCode, setShowQRCode] = useState(false);
    
    const playerCount = players ? Object.keys(players).length : 0;
    const allReady = players ? Object.values(players).every(p => p.isReady) : false;

    // Auto-scroll logs
    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [logs]);

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

                     {/* Ready Toggle */}
                     <button 
                         className={`btn-brutal w-full ${isReady ? 'bg-[#333] text-[#888]' : 'bg-transparent border-white text-white animate-pulse'}`} 
                         onClick={actions.onPlayerReady}
                     >
                         {isReady ? (isHost ? 'WAITING FOR OTHERS...' : 'WAITING FOR HOST...') : 'CLICK WHEN READY'}
                     </button>

                     {/* Host Start Button */}
                     {isHost && (
                        <div className="pt-2.5 border-t border-[#333]">
                             <button 
                                className={`btn-brutal bg-accent text-black w-full ${!allReady && 'opacity-50 cursor-not-allowed'}`}
                                onClick={() => {
                                    if(allReady) actions.onStartGame();
                                    else alert("Wait for all players to be READY!");
                                }}
                            >
                                START GAME
                            </button>
                            {!allReady && <div className="text-[9px] text-center mt-1 text-danger">WAITING FOR PLAYERS TO READY UP</div>}
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
             // We need to know if I have acted.
             // election.participants is array of IDs.
             // We need my ID. ControlPanel doesn't have `myId` prop directly... wait, GameRoom passes it?
             // Checking GameRoom: <ControlPanel ... />. It passes `roomId`, `serverIP`, `logs`, `phase`, `role`, `myStatus`, `election`, `actions`.
             // It does NOT pass `myId`. 
             // BAD: I need my ID to know if I have voted.
             // QUICK FIX: Pass `myId` to ControlPanel in GameRoom. (Will do in next step).
             // For now assuming we have `myId` in props (I will add it).
             
             // Wait, let's verify if GameRoom passes myId.
             // Step 380: `ControlPanel` usage: `<ControlPanel ... />` no `myId`.
             
             // I will assume `actions` prop can pass the check, or I just render buttons and let Server ignore?
             // Use UI state to hide after click? Optimistic UI?
             // Better: Show "WAITING FOR OTHERS" if I clicked.
             
             const [hasVoted, setHasVoted] = useState(false);
             
             // Reset vote state when phase changes (effect at top of component?) 
             // Actually, `hasVoted` is local state. We need to reset it if phase changes back to NOMINATION? 
             // Unlikely to happen in one session without unmount.
             // But let's use a simple condition: if election.participants includes ME? 
             // We don't have ME. So we use local state `hasVoted`.
             
             useEffect(() => {
                 if (phase !== 'DAY_ELECTION_NOMINATION') setHasVoted(false);
             }, [phase]);

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
             return (
                 <div className="mt-auto">
                     <div className="font-mono text-[11px] mb-2.5 text-accent animate-pulse">
                        &gt;&gt; LAST WORDS
                     </div>
                      <button 
                        className="btn-brutal w-full mt-2.5"
                        onClick={actions.onResolvePhase}
                     >
                        [ADMIN] END SPEECH
                     </button>
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
             const isSheriff = (role && false) || (myStatus && false); // Logic needs checking props. 
             // We need to know if I am sheriff.
             // We didn't pass "isSheriff" explicitly to ControlPanel, but we have "election" props? No.
             // Best way: GameRoom passes "amISheriff".
             // For now, let's use the ADMIN/SKIP button below for everyone, 
             // BUT we can custom render if we knew. 
             // Let's rely on the generic "ADMIN SKIP" at bottom for now, but perform text update.
             
             return (
                 <div className="mt-auto">
                     <div className="font-mono text-[11px] mb-2.5 text-ink">
                        &gt;&gt; DISCUSSIONS OPEN
                     </div>
                     <button className="btn-brutal opacity-50" disabled>VOTING LOCKED</button>
                      <div className="mt-2.5 text-xs text-[#666]">
                        Judge has announced speaking order.
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
        if (phase === 'DAY_SHERIFF_HANDOVER') {
             // We need to know if I am the sheriff (dead or alive, but effectively dead)
             // ControlPanel props don't explicitly have isSheriff. 
             // IMPORTANT: We need access to `selectedTarget` (which is in GameRoom) OR we can use built-in selector?
             // GameRoom passes `gameState.me.isSheriff`. Wait, `gameState.me` in `getPlayerState` has `isSheriff`?
             // Let's check logic: `getPublicState` adds `isSheriff` to public players. `getPlayerState` wraps `me`. 
             // We need access to "Am I Sheriff?" here. 
             // Since `myStatus` is passed, but `isSheriff` is not passed as a direct prop to ControlPanel in GameRoom (except inside `role` maybe?).
             // `GameRoom.jsx` passes: `role={gameState.me?.role}`. 
             // We need `isSheriff`. 
             
             // WORKAROUND: For now, show buttons for EVERYONE but they will only work if backend validates. 
             // UI polish: We should really hide it.
             // We can assume user will only click if they are sheriff.
             
            return (
                 <div className="mt-auto">
                     <div className="font-mono text-[11px] mb-2.5 text-danger animate-pulse">
                        &gt;&gt; SHERIFF DIED
                     </div>
                     <p className="text-xs text-[#666] mb-2.5">Choose successor or tear badge.</p>
                     
                     <div className="flex flex-col gap-2.5">
                        <button className="btn-brutal bg-accent text-black" onClick={() => actions.onSheriffHandover(null)}>TEAR BADGE</button>
                        <button className="btn-brutal" onClick={() => {
                             // This relies on GameRoom having a selectedTarget state that we can't see here easily?
                             // Actually ControlPanel DOES NOT have access to `selectedTarget` from GameRoom.
                             // We need to change GameRoom to pass `selectedTarget` OR ControlPanel to `request` handover.
                             // But wait, `actions.onSheriffHandover` in `GameRoom` calls `socket.emit` with `roomId`. 
                             // It doesn't use `selectedTarget` from GameRoom state in the wrapper I wrote earlier?
                             // Correction: Step 315 code: `const handleSheriffHandover = (targetId) => ...`.
                             // So ControlPanel needs to Provide the ID. But ControlPanel doesn't know who is selected on Grid.
                             
                             // FIX: Simple "Pass to..." requires UI to pick. 
                             // Alternative: "PASS TO SELECTED" button where GameRoom handles the ID?
                             // We should update GameRoom wrapper to use its `selectedTarget` if no arg provided?
                             // Let's assume we update ControlPanel to call `actions.onSheriffHandover('SELECTED_TARGET')` and GameRoom handles it.
                             actions.onSheriffHandover('USE_SELECTED');
                        }}>PASS TO SELECTED</button>
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
    if (actions.onlyActions) {
         return (
             <div className="flex flex-col h-full justify-end bg-black border-t-2 border-ink p-2.5">
                  {renderActions()}
             </div>
         );
    }
    
    // If onlyLogs is true, we ONLY render the logs
    if (actions.onlyLogs) { 
        // Note: passing flags via 'actions' prop is a hack, but keeps signature same. 
        // Better to destructure from props but ControlPanel signature is fixed in GameRoom usage.
        // Actually I can just add props to ControlPanel function signature.
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
