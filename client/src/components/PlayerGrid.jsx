import React from 'react';

// Simple SVGs for avatars
const Avatars = [
    (
        <svg viewBox="0 0 100 100">
            <rect x="20" y="20" width="60" height="60" strokeWidth="2" fill="none" stroke="currentColor" />
            <path d="M30 40 L40 50 L30 60 M70 40 L60 50 L70 60" stroke="currentColor" fill="none" strokeWidth="4" />
        </svg>
    ),
    (
        <svg viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="30" strokeWidth="1" fill="none" stroke="currentColor" />
            <path d="M40 45 L45 45 M55 45 L60 45 M45 60 Q50 65 55 60" stroke="currentColor" fill="none" strokeWidth="2" />
        </svg>
    ),
    (
        <svg viewBox="0 0 100 100">
            <path d="M20 80 L50 20 L80 80 Z" fill="none" stroke="currentColor" strokeWidth="2" />
            <circle cx="50" cy="55" r="5" fill="currentColor" />
        </svg>
    ),
    (
        <svg viewBox="0 0 100 100">
            <rect x="25" y="25" width="50" height="50" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="4" />
            <path d="M35 45 L40 40 M60 40 L65 45" stroke="currentColor" strokeWidth="4" />
        </svg>
    ),
    (
        <svg viewBox="0 0 100 100">
            <path d="M50 20 Q80 50 50 80 Q20 50 50 20" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
    ),
    (
        <svg viewBox="0 0 100 100">
             <path d="M20 20 L80 80 M20 80 L80 20" stroke="currentColor" strokeWidth="2" />
        </svg>
    )
];

export default function PlayerGrid({ players, myId, selectedId, onSelect, phase }) {
    return (
        <>
            {Object.values(players).map(player => {
                const isMe = player.id === myId;
                const isSelected = player.id === selectedId;
                const isDead = player.status === 'dead';
                
                // Determine what to show in status
                let statusText = "Identity: Unknown";
                if (isMe) statusText = `Identity: ${player.role || 'Hidden'}`;
                if (isDead) statusText = "Status: Deceased";
                // If special reveal logic (e.g. Wolf sees Wolf)
                if (player.role === 'WOLF' && !isMe && !isDead) { // If logic passed role, show it
                     statusText = "Identity: Wolf";
                }

                return (
                    <div 
                        key={player.id} 
                        className={`
                            relative bg-[#151515] border-2 border-ink h-full min-h-[120px] md:min-h-[200px] 
                            transition-all duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] overflow-hidden cursor-pointer
                            hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[12px_12px_0px_var(--accent)] hover:bg-ink hover:text-black
                            ${isSelected ? 'bg-accent text-black border-black -rotate-1 -translate-x-1 -translate-y-1 shadow-[12px_12px_0px_#fff]' : ''}
                            ${isDead ? 'opacity-30 grayscale blur-[1px] pointer-events-none' : ''}
                        `}
                        onClick={() => !isDead && onSelect(player.id)}
                    >
                        <div className="absolute top-2.5 left-2.5 font-mono text-2xl md:text-[40px] leading-none z-10">{player.avatar || '00'}</div>
                        <div className="absolute top-2.5 right-2.5 font-mono text-[11px] md:text-sm font-bold z-10 flex flex-col items-end">
                            <span>{player.name} {isMe && '(YOU)'}</span>
                            {/* Ready Status */}
                            {phase === 'WAITING' && (
                                <span className={`text-[10px] ${player.isReady ? 'text-accent' : 'text-[#444]'}`}>
                                    {player.isReady ? 'READY' : '...'}
                                </span>
                            )}
                        </div>
                        
                        <div className="w-full h-full flex items-center justify-center opacity-80 mix-blend-luminosity">
                            <div className="w-[70%] h-auto fill-current">
                                {Avatars[(player.avatar || 1) - 1] || Avatars[0]}
                            </div>
                        </div>
                        
                        <div className="absolute bottom-2.5 right-2.5 writing-vertical-rl text-xs uppercase border-l border-current pl-[5px]">
                            {statusText}
                        </div>

                        {/* Voting Indicator - simplified */}
                        {player.isVoting && phase === 'DAY' && (
                            <div className="absolute top-2 right-2 text-[10px] bg-black px-1 border border-ink">
                    {player.status === 'dead' ? 'DEAD' : (player.id === myId ? 'ME' : 'PLAYER')}
                </div>
                        )}
                
                {/* Sheriff Badge */}
                {player.isSheriff && (
                    <div className="absolute top-2 left-2 text-xl filter drop-shadow-[0_0_5px_rgba(255,215,0,0.8)] z-20">
                        👮
                    </div>
                )}
                    </div>
                );
            })}
        </>
    );
}
