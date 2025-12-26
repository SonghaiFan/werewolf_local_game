import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameContext } from '../context/GameContext';

// Role SVGs (Geometric)
const RoleIcons = {
    WOLF: (
        <svg viewBox="0 0 100 100" className="w-full h-full fill-current">
            <path d="M20 80 L30 40 L50 70 L70 40 L80 80 Z" />
            <circle cx="35" cy="55" r="3" fill="var(--color-bg)" />
            <circle cx="65" cy="55" r="3" fill="var(--color-bg)" />
        </svg>
    ),
    VILLAGER: (
        <svg viewBox="0 0 100 100" className="w-full h-full fill-current">
            <rect x="30" y="40" width="40" height="40" stroke="currentColor" strokeWidth="4" fill="none" />
            <path d="M25 40 L50 15 L75 40" stroke="currentColor" strokeWidth="4" fill="none" />
            <rect x="45" y="60" width="10" height="20" fill="currentColor" />
        </svg>
    ),
    SEER: (
        <svg viewBox="0 0 100 100" className="w-full h-full fill-current">
            <circle cx="50" cy="50" r="30" stroke="currentColor" strokeWidth="2" fill="none" />
            <circle cx="50" cy="50" r="10" fill="currentColor" />
            <path d="M50 20 L50 80 M20 50 L80 50" stroke="currentColor" strokeWidth="1" />
        </svg>
    ),
    WITCH: (
        <svg viewBox="0 0 100 100" className="w-full h-full fill-current">
            <path d="M20 70 Q50 90 80 70" fill="none" stroke="currentColor" strokeWidth="4" />
            <path d="M30 70 L50 20 L70 70 Z" stroke="currentColor" strokeWidth="2" fill="none" />
            <circle cx="50" cy="60" r="5" fill="currentColor" />
            <path d="M40 30 L60 30" stroke="currentColor" strokeWidth="2" />
        </svg>
    ),
    UNKNOWN: (
        <svg viewBox="0 0 100 100" className="w-full h-full fill-current opacity-20">
            <rect x="30" y="30" width="40" height="40" stroke="currentColor" strokeWidth="2" fill="none" strokeDasharray="4" />
            <path d="M30 30 L70 70 M70 30 L30 70" stroke="currentColor" strokeWidth="1" />
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
        wolfVotes, // map: {wolfId: targetId}
        selectedTarget, 
        setSelectedTarget,
        actions // Access actions to trigger socket events
    } = useGameContext();

    if (!player) return null;
    const [isRevealed, setIsRevealed] = React.useState(false);

    // Derived Selection Logic
    const isSelected = selectedTarget === player.id;
    // Use prop if provided, otherwise use context action (which handles wolf logic), fallback to simple set
    const handleSelect = onSelect !== undefined ? onSelect : (actions?.onSelect || setSelectedTarget);
    
    // Derived Inspection Logic
    const inspectedRole = inspectedPlayers ? inspectedPlayers[player.id] : null;

    const isMe = player.id === myId;
    const isDead = player.status === 'dead';
    
    // --- Decision Tree ---

    // 1. Victim Status (Witch Vision)
    // Robust check handling both array (multi-wolf) or single ID formats
    const pId = String(player.id);
    const isVictim = Array.isArray(wolfTarget) 
        ? wolfTarget.some(t => String(t) === pId) 
        : String(wolfTarget) === pId;
    
    // 2. Visibility State (Face Up vs Face Down)
    // - Self: Explicit reveal via state
    // - Dead: Always revealed
    // - Public: Backend provided specific role (excluding internal 'scanned')
    // NOTE: Seer inspection does NOT reveal the card face, only the Faction Badge.
    const hasPublicRole = !!player.role && player.role !== 'scanned';
    const showCardFace = (isMe && isRevealed) || isDead || (hasPublicRole && !isMe); 
    
    // 3. Asset Resolution
    const roleKey = (player.role || 'UNKNOWN').toUpperCase();
    const roleIcon = RoleIcons[roleKey] || RoleIcons.UNKNOWN;

    // 4. Interactivity
    const isSelectable = !isDead; 
    const canInteract = handleSelect && isSelectable;

    return (
        <div 
            className={`
                relative bg-surface border h-full min-h-[140px] rounded-xl
                transition-all duration-300 ease-out overflow-hidden flex flex-col
                ${canInteract ? 'cursor-pointer hover:border-accent/50 hover:shadow-lg hover:-translate-y-1' : ''}
                ${!canInteract && !isMe ? 'opacity-90' : ''}
                ${!isSelectable && !isMe ? 'opacity-50 grayscale cursor-not-allowed' : ''}
                ${isSelected ? 'border-accent ring-2 ring-accent/30 shadow-xl scale-[1.02]' : 'border-white/5'}
                ${isDead ? 'opacity-40 grayscale blur-[1px] pointer-events-none' : ''}
                ${isVictim ? 'ring-2 ring-purple-500 border-purple-500 bg-purple-900/10' : ''}
                ${inspectedRole === 'WOLF' ? 'ring-2 ring-danger border-danger bg-danger/10' : ''}
                ${inspectedRole && inspectedRole !== 'WOLF' ? 'ring-2 ring-success border-success bg-success/10' : ''}
                ${className}
            `}
            onClick={() => canInteract && handleSelect(player.id)}
        >
            {/* Top Bar: Player Name & Status */}
            <div className={`px-3 py-2 border-b border-white/5 flex justify-between items-center text-xs backdrop-blur-sm bg-black/20 ${isSelected ? 'bg-accent/10' : ''}`}>
                <span className={`truncate max-w-[80px] font-medium ${isSelected ? 'text-accent' : 'text-text-secondary'}`}>{player.name} {isMe && `(${t('you')})`}</span>
                 {/* Ready Status */}
                 {phase === 'WAITING' && (
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${player.isReady ? 'text-success bg-success/10' : 'text-text-secondary bg-white/5'}`}>
                        {player.isReady ? t('ready_short') : t('not_ready_short')}
                    </span>
                )}
            </div>

            {/* Main Content Area */}
            <div className="flex-1 relative flex items-center justify-center p-2">
                {/* PERSISTENT PLAYER NUMBER BADGE */}
                <div className="absolute top-2 right-2 z-20 bg-surface/80 backdrop-blur-md text-text-secondary text-xs font-mono px-2 py-1 rounded-md border border-white/10 shadow-sm select-none">
                    {String(player.avatar || '0').padStart(2, '0')}
                </div>

                {showCardFace ? (
                    // --- FRONT (Role Revealed) ---
                    <div 
                        className="w-full h-full flex flex-col items-center justify-center animate-in fade-in duration-300 cursor-pointer"
                        onClick={(e) => {
                            if (isMe && !isDead) { // Allow hiding if alive and it's me
                                e.stopPropagation();
                                setIsRevealed(false);
                            }
                        }}
                    >
                        <div className="w-10 h-10 md:w-16 md:h-16 mb-2">
                            {roleIcon}
                        </div>
                        <div className="text-sm md:text-lg font-bold uppercase tracking-wider text-text-primary">
                            {/* Translate Role */}
                            {roleKey ? t(`roles.${roleKey}`, roleKey) : t('unknown_role')}
                        </div>
                         {isDead && <div className="text-danger font-medium text-xs bg-danger/10 px-2 py-0.5 rounded-full mt-2">{t('deceased')}</div>}
                    </div>
                ) : (
                    // --- BACK (Hidden / Number) ---
                    <div className="w-full h-full flex items-center justify-center relative">
                        {/* Player Number (Avatar ID as visual identifier) */}
                        <div className="font-mono text-4xl md:text-6xl font-bold opacity-[0.03] select-none text-white">
                            {String(player.avatar || '00').padStart(2, '0')}
                        </div>
                        
                        {/* Tap to Reveal Overlay for Self */}
                        {isMe && !isDead && (
                             <div className="absolute inset-0 z-30 flex flex-col items-center justify-center transition-colors cursor-pointer"
                                 onClick={(e) => { e.stopPropagation(); setIsRevealed(true); }}
                             >
                                 <div className="bg-surface/90 backdrop-blur border border-white/10 px-4 py-2 rounded-full shadow-lg flex items-center gap-2 group-hover:bg-surface text-text-primary transition-colors">
                                     <span className="text-xs font-medium tracking-wide">{t('reveal')}</span>
                                 </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Badges / Overlays */}
         
            
            {/* Victim Badge (Witch Vision) */}
            {isVictim && <div className="absolute top-2 left-2 bg-purple-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md z-20 shadow-lg">{t('victim')}</div>}
            
            {/* Host Badge - Bottom Right */}
            {player.id === hostId && (
                 <div className="absolute bottom-2 left-2 bg-text-secondary/20 text-text-secondary backdrop-blur-sm text-[10px] px-2 py-0.5 rounded-full font-medium z-20">
                     {t('host')}
                 </div>
            )}
            
            {/* Inspected Faction Badge (Seer Vision) - Replaces basic 'scanned' or accompanies it? User asked for Good/Bad. */}
            {/* We overlay this CLEARLY on top if inspected */}
            {/* Inspected Faction Badge (Seer Vision) */}
            {inspectedRole && (
                <div className={`
                    absolute top-2 left-2 text-white text-[10px] font-bold px-2 py-0.5 rounded-md z-30 shadow-lg
                    ${inspectedRole === 'WOLF' ? 'bg-danger' : 'bg-success'}
                `}>
                    {inspectedRole === 'WOLF' ? t('identity_bad') : t('identity_good')}
                </div>
            )}

             {/* Voting Indicator */}
             {player.isVoting && phase === 'DAY_VOTE' && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40">
                     <div className="bg-black/80 backdrop-blur text-white text-xs font-bold px-3 py-1.5 rounded-full border border-white/20 shadow-lg">
                        {t('voted')}
                     </div>
                </div>
            )}

            {/* Wolf Proposal Indicators (Only visible to wolves via context) */}
            {wolfVotes && phase === 'NIGHT_WOLVES' && Object.entries(wolfVotes).map(([wolfId, targetId]) => {
                if (String(targetId) === String(player.id)) {
                    // We need to show WHICH wolf voted. 
                    // ideally we map wolfId to an Avatar Number if we had full player list in context or passed it down.
                    // For now, let's just show a small wolf icon or badge.
                    // Actually, let's try to get the avatar number if possible, or just a generic marker with ID hash if not.
                    // Simplified: Just show "Wolf Select"
                    return (
                        <div key={wolfId} className="absolute bottom-2 right-2 z-40">
                           <div className="bg-danger text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-lg">
                               WOLF SELECT
                           </div>
                        </div>
                    );
                }
                return null;
            })}
        </div>
    );
}
