import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameContext } from '../context/GameContext';

// Role SVGs (Modern Minimalist)
const RoleIcons = {
    WOLF: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
            <path d="M19.07 4.93L17 9h-2l-2-5-2 5H9L7 4.93 3 13h18l-4-8.07z" />
            <circle cx="10" cy="14" r="1.5" fill="currentColor" stroke="none" />
            <circle cx="14" cy="14" r="1.5" fill="currentColor" stroke="none" />
            <path d="M12 18v1" />
        </svg>
    ),
    VILLAGER: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
            <path d="M3 21h18" />
            <path d="M5 21V7l8-4 8 4v14" />
            <path d="M9 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4" />
            <path d="M9 21v-5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v5" />
        </svg>
    ),
    SEER: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
            <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
            <circle cx="12" cy="12" r="3" />
        </svg>
    ),
    WITCH: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
            <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
        </svg>
    ),
    UNKNOWN: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full opacity-30">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <path d="M12 17h.01" />
        </svg>
    )
};

export default function AvatarCard({ 
    player, 
    onSelect, 
    className = "" 
}) {
    const { t } = useTranslation();
    const { 
        myId, 
        phase, 
        hostId, 
        wolfTarget, 
        inspectedPlayers,
        wolfVotes,
        selectedTarget, 
        setSelectedTarget,
        actions
    } = useGameContext();

    if (!player) return null;
    const [isRevealed, setIsRevealed] = React.useState(false);

    // Derived Selection Logic
    const isSelected = selectedTarget === player.id;
    const handleSelect = onSelect !== undefined ? onSelect : (actions?.onSelect || setSelectedTarget);
    
    // Derived Inspection Logic
    const inspectedRole = inspectedPlayers ? inspectedPlayers[player.id] : null;

    const isMe = player.id === myId;
    const isDead = player.status === 'dead';
    
    const pId = String(player.id);
    const isVictim = Array.isArray(wolfTarget) 
        ? wolfTarget.some(t => String(t) === pId) 
        : String(wolfTarget) === pId;
    
    const hasPublicRole = !!player.role && player.role !== 'scanned';
    const showCardFace = (isMe && isRevealed) || isDead || (hasPublicRole && !isMe); 
    
    const roleKey = (player.role || 'UNKNOWN').toUpperCase();
    const roleIcon = RoleIcons[roleKey] || RoleIcons.UNKNOWN;

    const isSelectable = !isDead; 
    const canInteract = handleSelect && isSelectable;

    return (
        <div 
            className={`
                relative w-full aspect-square flex flex-col justify-between
                bg-surface/60 backdrop-blur-sm border border-white/5 rounded-[var(--radius-lg)] shadow-lg
                transition-all duration-300 ease-out overflow-hidden
                ${canInteract ? 'cursor-pointer hover:bg-surface hover:shadow-xl hover:-translate-y-1' : ''}
                ${!canInteract && !isMe ? 'opacity-90' : ''}
                ${!isSelectable && !isMe ? 'opacity-40 grayscale blur-[1px] cursor-not-allowed' : ''}
                ${isSelected ? 'ring-2 ring-primary border-transparent bg-primary/10 shadow-[0_0_20px_rgba(99,102,241,0.3)]' : ''}
                ${isDead ? 'opacity-30 grayscale blur-[2px] pointer-events-none' : ''}
                ${isVictim ? 'ring-2 ring-purple-500 bg-purple-500/10' : ''}
                ${inspectedRole === 'WOLF' ? 'ring-2 ring-danger bg-danger/10' : ''}
                ${inspectedRole && inspectedRole !== 'WOLF' ? 'ring-2 ring-emerald-500 bg-emerald-500/10' : ''}
                ${className}
            `}
            style={{
                borderRadius: 'var(--radius-lg)'
            }}
            onClick={() => canInteract && handleSelect(player.id)}
        >
            {/* Top Bar: Player Name & Status */}
            <div className={`
                p-1.5 border-b border-border/50 flex justify-between items-center text-xs
                ${isSelected ? 'bg-primary/10' : 'bg-surface'}
            `}>
                <span className="truncate max-w-[85px] font-medium text-ink/90">
                    {player.name} {isMe && <span className="text-muted text-[10px] ml-0.5">({t('you')})</span>}
                </span>
                 {/* Ready Status indicator */}
                 {phase === 'WAITING' && (
                    <span className={`w-1.5 h-1.5 rounded-full ${player.isReady ? 'bg-primary shadow-[0_0_8px_rgba(var(--color-primary),0.5)]' : 'bg-border'}`} />
                )}
            </div>

            {/* Main Content */}
            <div className="flex-1 relative flex items-center justify-center p-2">
                {/* Player Number Badge */}
                <div className="absolute top-1 right-1 z-10 text-[10px] font-mono text-muted/50 font-bold select-none">
                    #{String(player.avatar || '0').padStart(2, '0')}
                </div>

                {showCardFace ? (
                    // --- FRONT (Role Revealed) ---
                    <div 
                        className="w-full h-full flex flex-col items-center justify-center animate-in zoom-in duration-300 cursor-pointer"
                        onClick={(e) => {
                            if (isMe && !isDead) {
                                e.stopPropagation();
                                setIsRevealed(false);
                            }
                        }}
                    >
                        <div className={`w-8 h-8 md:w-10 md:h-10 mb-1 ${isDead ? 'text-muted' : 'text-primary'}`}>
                            {roleIcon}
                        </div>
                        <div className="text-xs font-bold uppercase tracking-wider text-ink/90 scale-75 md:scale-100 origin-center transition-transform">
                            {roleKey ? t(`roles.${roleKey}`, roleKey) : t('unknown_role')}
                        </div>
                         {isDead && <div className="mt-1 px-2 py-0.5 bg-zinc-800 text-muted rounded text-[10px] uppercase tracking-wider">{t('deceased')}</div>}
                    </div>
                ) : (
                    // --- BACK (Hidden) ---
                    <div className="w-full h-full flex items-center justify-center relative group">
                        {/* Large Number */}
                        <div className="font-mono text-5xl font-bold text-border select-none group-hover:text-muted transition-colors">
                            {String(player.avatar || '00').padStart(2, '0')}
                        </div>
                        
                        {/* Tap to Reveal (Self) */}
                        {isMe && !isDead && (
                             <div className="absolute inset-0 z-30 flex flex-col items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-[2px]"
                                 onClick={(e) => { e.stopPropagation(); setIsRevealed(true); }}
                             >
                                <span className="text-xs font-medium text-white bg-black/50 px-3 py-1.5 rounded-full border border-white/20 backdrop-blur-md">
                                    {t('reveal')}
                                </span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Status Badges Overlay */}
            <div className="absolute bottom-2 left-2 flex flex-col gap-1 z-20 pointer-events-none">
                {isVictim && (
                    <div className="bg-purple-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg animate-pulse">
                        {t('victim')}
                    </div>
                )}
                {inspectedRole && (
                    <div className={`
                        text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg
                        ${inspectedRole === 'WOLF' ? 'bg-danger' : 'bg-green-600'}
                    `}>
                        {inspectedRole === 'WOLF' ? t('identity_bad') : t('identity_good')}
                    </div>
                )}
            </div>
            
            {/* Host Badge */}
            {player.id === hostId && (
                 <div className="absolute bottom-2 right-2 pointer-events-none">
                     <div className="w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center shadow-sm">
                        <svg className="w-2.5 h-2.5 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                     </div>
                 </div>
            )}

            {/* Voting Indicator */}
             {player.isVoting && phase === 'DAY_VOTE' && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40">
                     <div className="bg-danger text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg shadow-red-500/20 animate-bounce">
                        {t('voted')}
                     </div>
                </div>
            )}

            {/* Wolf Proposal Indicators */}
            {wolfVotes && phase === 'NIGHT_WOLVES' && Object.entries(wolfVotes).map(([wolfId, targetId]) => {
                if (String(targetId) === String(player.id)) {
                    return (
                        <div key={wolfId} className="absolute -top-2 -right-2 z-40 animate-bounce">
                           <div className="bg-red-600 text-white w-5 h-5 rounded-full flex items-center justify-center border-2 border-surface shadow-sm text-[10px]">
                               W
                           </div>
                        </div>
                    );
                }
                return null;
            })}
        </div>
    );
}
