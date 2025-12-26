import React, { useEffect, useRef } from 'react';

export default function Sidebar({ logs, phase, role, myStatus, checkNightEnd, actions }) {
    const logsEndRef = useRef(null);

    // Auto-scroll logs
    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [logs]);

    const renderActions = () => {
        if (myStatus === 'dead') {
             return <div className="action-area"><button className="btn-brutal" disabled>YOU ARE DEAD</button></div>;
        }

        if (phase === 'WAITING') {
             return (
                 <div className="action-area">
                     <button className="btn-brutal btn-start" onClick={actions.onStartGame}>START GAME</button>
                     <p style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>Waiting for players...</p>
                 </div>
             );
        }

        if (phase === 'NIGHT') {
             if (role === 'WOLF') {
                 return (
                     <div className="action-area">
                         <div style={{fontFamily: 'Space Mono', fontSize: '11px', marginBottom: '10px', color: '#666'}}>
                            INPUT COMMAND &gt;&gt; KILL
                         </div>
                         <button className="btn-brutal" onClick={actions.onNightAction}>EXECUTE ATTACK</button>
                     </div>
                 );
             }
             if (role === 'SEER') {
                 return (
                    <div className="action-area">
                        <div style={{fontFamily: 'Space Mono', fontSize: '11px', marginBottom: '10px', color: '#666'}}>
                           INPUT COMMAND &gt;&gt; SCAN
                        </div>
                        <button className="btn-brutal" onClick={actions.onNightAction}>REVEAL IDENTITY</button>
                    </div>
                 );
             }
             if (role === 'WITCH') {
                 return (
                    <div className="action-area">
                        <div style={{fontFamily: 'Space Mono', fontSize: '11px', marginBottom: '10px', color: '#666'}}>
                           INPUT COMMAND &gt;&gt; POTION
                        </div>
                        {/* Simplified Witch UI for MVP */}
                        <div style={{display:'flex', flexDirection:'column', gap:'10px'}}>
                            <button className="btn-brutal" onClick={() => actions.onWitchAction('save')}>SAVE VICTIM</button>
                            <button className="btn-brutal" onClick={() => actions.onWitchAction('poison')}>POISON TARGET</button>
                            <button className="btn-secondary" onClick={() => actions.onWitchAction('skip')}>SKIP TURN</button>
                        </div>
                    </div>
                 );
             }
             return (
                 <div className="action-area">
                     <button className="btn-brutal" disabled>SLEEPING...</button>
                 </div>
             );
        }

        if (phase === 'DAY') {
             return (
                 <div className="action-area">
                     <div style={{fontFamily: 'Space Mono', fontSize: '11px', marginBottom: '10px', color: '#666'}}>
                        INPUT COMMAND &gt;&gt; VOTE
                     </div>
                     <button className="btn-brutal" onClick={actions.onDayVote}>CAST VOTE</button>
                     <div className="secondary-actions">
                         <button className="btn-secondary" onClick={actions.onSkipTurn}>SKIP</button> 
                         <button className="btn-secondary">SIGNAL</button>
                     </div>
                 </div>
             );
        }

        // FINISHED
        return (
            <div className="action-area">
                <button className="btn-brutal btn-start" onClick={() => window.location.reload()}>REBOOT SYSTEM</button>
            </div>
        );
    };

    return (
        <aside className="sidebar">
            <div className="log-list">
                {logs.map((log, i) => (
                    <div key={i} className={`log-entry ${i === logs.length - 1 ? 'active' : ''}`}>
                        {log}
                    </div>
                ))}
                <div ref={logsEndRef} />
            </div>
            
            {renderActions()}

            {/* Admin/Debug Resolve Button (Host Only - logic handled by parent visibility or just always show for now for testing) */}
            <div style={{marginTop: '20px', borderTop: '1px dashed #333', paddingTop: '10px'}}>
               <button 
                  onClick={actions.onResolvePhase} 
                  style={{background: 'transparent', border: '1px solid #333', color: '#666', width: '100%', fontSize: '10px', padding: '5px', cursor: 'pointer'}}
               >
                  [ADMIN] FORCE RESOLVE PHASE
               </button>
            </div>
        </aside>
    );
}
