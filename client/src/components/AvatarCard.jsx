import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameContext } from '../context/GameContext';
import { RoleIcons } from './RoleIcons';

export default function AvatarCard({ 
    player, 
    onSelect, 
    size = "7rem",
    className = "" 
}) {
    const { t } = useTranslation();
    const { 
        gameState,
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

    const [isRevealed, setIsRevealed] = React.useState(false);
    if (!player) return null;

    // Derived Selection Logic
    const isSelected = selectedTarget === player.id;
    const handleSelect = onSelect !== undefined ? onSelect : (actions?.onSelect || setSelectedTarget);
    
    // Derived Inspection Logic
    const inspectedRole = inspectedPlayers ? inspectedPlayers[player.id] : null;

    const isMe = player.id === myId;
    const isDead = player.status === 'dead';
    const isMyHunterTurn = phase === 'DAY_HUNTER_DECIDE' && gameState.hunterDeadId === myId;
    
    const pId = String(player.id);
    const isVictim = Array.isArray(wolfTarget) 
        ? wolfTarget.some(t => String(t) === pId) 
        : String(wolfTarget) === pId;
        
    const hasPublicRole = !!player.role && player.role !== 'scanned';
    
    // Determine if we should show the card face
    // If it's my Hunter turn, I shouldn't see others roles yet.
    const showCardFace = (isMe && isRevealed) || (player.role && (isDead || (hasPublicRole && !isMe))); 
    
    const roleKey = (player.role || 'UNKNOWN').toUpperCase();
    const roleIcon = RoleIcons[roleKey] || RoleIcons.UNKNOWN;

    const { isTargetDisabled, disabledReason } = useMemo(() => {
        const availableActions = gameState.me?.availableActions || [];
        const action = availableActions.find(action => 
            action.needsTarget && action.disabledTargets && action.disabledTargets.includes(player.id)
        );
        return {
            isTargetDisabled: !!action,
            disabledReason: action?.disabledReasons?.[player.id]
        };
    }, [gameState.me?.availableActions, player.id]);

    const isSelectable = (!isDead || isMyHunterTurn) && !isTargetDisabled && player.status !== 'dead'; 
    const canInteract = handleSelect && isSelectable;

    // Visual State
    const dimEffect = (isDead && !isMe) || (isDead && isMe && !isMyHunterTurn);
    const blurEffect = (isDead && !isMe) || (isDead && isMe && !isMyHunterTurn);

    return (
        <div 
            className={`
                relative aspect-square flex flex-col justify-between
                bg-surface/60 backdrop-blur-sm border border-white/5 rounded-[var(--radius-lg)] shadow-lg
                transition-all duration-300 ease-out overflow-hidden
                ${canInteract ? 'cursor-pointer hover:bg-surface hover:shadow-xl hover:-translate-y-1' : ''}
                ${dimEffect ? 'opacity-40 grayscale' : ''}
                ${blurEffect ? 'blur-[1px]' : ''}
                ${isSelected ? 'ring-2 ring-primary border-transparent bg-primary/10 shadow-[0_0_20px_rgba(99,102,241,0.3)]' : ''}
                ${isVictim ? 'ring-2 ring-purple-500 bg-purple-500/10' : ''}
                ${inspectedRole === 'WOLF' ? 'ring-2 ring-danger bg-danger/10' : ''}
                ${inspectedRole && inspectedRole !== 'WOLF' ? 'ring-2 ring-emerald-500 bg-emerald-500/10' : ''}
                ${className}
            `}
            style={{
                borderRadius: 'var(--radius-lg)',
                width: size
            }}
            onClick={() => {
                if (canInteract) {
                    handleSelect(player.id);
                } else if (disabledReason) {
                    alert(t(disabledReason));
                }
            }}
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
                            if (isMe && !isDead && !canInteract) {
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
                         {isDead && !isMyHunterTurn && <div className="mt-1 px-2 py-0.5 bg-zinc-800 text-muted rounded text-[10px] uppercase tracking-wider">{t('deceased')}</div>}
                         {isMyHunterTurn && <div className="mt-1 px-2 py-0.5 bg-primary/20 text-primary border border-primary/20 rounded text-[10px] uppercase tracking-widest font-black animate-pulse">{t('hunter_active')}</div>}
                        
                        {/* Reveal Toggle Button (Self Only - Hide) */}
                        {isMe && !isDead && (
                             <div 
                                className="absolute -bottom-2 -left-2 z-40 p-2 rounded-full hover:bg-black/20 text-primary/40 hover:text-primary transition-colors cursor-pointer"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsRevealed(false);
                                }}
                             >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M3 3l18 18" />
                                </svg>
                            </div>
                        )}
                    </div>
                ) : (
                    // --- BACK (Hidden) ---
                    <div 
                        className="w-full h-full flex items-center justify-center relative group"
                        onClick={(e) => { 
                            if(isMe && !isDead && !canInteract) { 
                                e.stopPropagation(); 
                                setIsRevealed(true); 
                            } 
                        }}
                    >

                        {/* Large Number (Background) */}
                        <div className={`font-mono text-4xl font-black select-none transition-all duration-300 ${isMe && !isDead ? 'text-primary/5 scale-90 group-hover:scale-100' : 'text-white/5'}`}>
                            {String(player.avatar || '00').padStart(2, '0')}
                        </div>
                        
                        {/* Reveal Toggle Button (Self Only) */}
                        {isMe && !isDead && (
                             <div 
                                className="absolute -bottom-2 -left-2 z-40 p-2 rounded-full hover:bg-black/20 text-primary/40 hover:text-primary transition-colors cursor-pointer"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsRevealed(true);
                                }}
                             >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Status Badges Overlay */}
            <div className="absolute bottom-2 left-2 flex flex-col gap-1 z-20 pointer-events-none">
                {/* Guard Protection Target */}
                {gameState.me?.guardTarget === player.id && (
                     <div className="bg-sky-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg flex items-center gap-1">
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                        <span>{t('roles.GUARD')}</span>
                     </div>
                )}

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
             {player.isVoting && (phase === 'DAY_VOTE' || phase === 'DAY_ELIMINATION') && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40">
                     {player.hasAbstained ? (
                         <div className="bg-zinc-500 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg opacity-90">
                            {t('abstain')}
                         </div>
                     ) : (
                         <div className="bg-danger text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg shadow-red-500/20 animate-bounce">
                            {t('voted')}
                         </div>
                     )}
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
