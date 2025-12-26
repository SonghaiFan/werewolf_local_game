import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameContext } from '../context/GameContext';
import { RoleIcons } from './RoleIcons';

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
            {/* Top Bar: Index First, Name Second */}
            <div className={`
                px-3 py-2 border-b border-border/50 flex justify-between items-center
                ${isSelected ? 'bg-primary/10' : 'bg-surface'}
            `}>
                <div className="flex items-baseline gap-2 overflow-hidden">
                    <span className="font-mono text-lg font-black text-white leading-none tracking-tight">
                        {String(player.avatar || '0').padStart(2, '0')}
                    </span>
                    <span className="truncate text-[9px] text-muted/60 font-medium uppercase tracking-wide">
                        {player.name} {isMe && t('you')}
                    </span>
                </div>
                 {/* Ready Status indicator */}
                 {phase === 'WAITING' && (
                    <span className={`shrink-0 w-1.5 h-1.5 rounded-full ${player.isReady ? 'bg-primary shadow-[0_0_8px_rgba(var(--color-primary),0.5)]' : 'bg-border'}`} />
                )}
            </div>

            {/* Main Content */}
            <div className="flex-1 relative flex items-center justify-center p-2">

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
                    <div 
                        className="w-full h-full flex items-center justify-center relative group"
                        onClick={(e) => { 
                            if(isMe && !isDead) { e.stopPropagation(); setIsRevealed(true); } 
                        }}
                    >
                        {/* Large Number (Background) */}
                        <div className={`font-mono text-4xl font-black select-none transition-all duration-300 ${isMe && !isDead ? 'text-primary/5 scale-90 blur-[1px] group-hover:blur-0 group-hover:scale-100' : 'text-white/5'}`}>
                            {String(player.avatar || '00').padStart(2, '0')}
                        </div>
                        
                        {/* Reveal Hint (Self Only) - Modern & Clean */}
                        {isMe && !isDead && (
                             <div className="absolute inset-0 z-30 flex flex-col items-center justify-center cursor-pointer">
                                <span className="mt-1.5 text-[8px] font-bold uppercase tracking-[0.2em] text-primary/60 group-hover:text-primary transition-colors">
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
                        <div key={wolfId} className="absolute top-2 right-1 z-40 animate-bounce">
                           <div className="bg-red-600 text-white w-5 h-5 rounded-full flex items-center justify-center border-2 border-surface shadow-sm text-[10px]">
                               <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                           </div>
                        </div>
                    );
                }
                return null;
            })}
        </div>
    );
}
