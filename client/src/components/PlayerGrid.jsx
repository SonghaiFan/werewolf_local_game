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
        <div className="main-stage">
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
                        className={`player-card ${isSelected ? 'selected' : ''} ${isDead ? 'dead' : ''}`}
                        onClick={() => !isDead && onSelect(player.id)}
                    >
                        <div className="id">{player.avatar || '00'}</div>
                        <div className="name-tag">{player.name} {isMe && '(YOU)'}</div>
                        
                        <div className="avatar-box">
                            {Avatars[(player.avatar || 1) - 1] || Avatars[0]}
                        </div>
                        
                        <div className="role-status">
                            {statusText}
                        </div>

                        {/* Voting Indicator - simplified */}
                        {player.isVoting && phase === 'DAY' && (
                            <div style={{position: 'absolute', bottom: '50px', right: '10px', fontSize: '20px'}}>
                                🗳️
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
