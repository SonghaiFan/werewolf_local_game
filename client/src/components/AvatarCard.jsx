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
                relative bg-[#151515] border-2 h-full min-h-[120px] md:min-h-[140px] 
                transition-all duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] overflow-hidden flex flex-col
                ${canInteract ? 'cursor-pointer' : ''}
                ${!canInteract && !isMe ? 'opacity-90' : ''}
                ${!isSelectable && !isMe ? 'opacity-50 grayscale cursor-not-allowed' : ''}
                ${isSelected ? 'bg-accent text-black border-black -rotate-1 -translate-x-1 -translate-y-1 shadow-[8px_8px_0px_#fff]' : 'border-[#333] text-ink'}
                ${isDead ? 'opacity-40 grayscale blur-[0.5px] pointer-events-none border-dashed' : ''}
                ${isVictim ? 'ring-4 ring-offset-2 ring-purple-600 border-purple-600 bg-purple-900/20' : ''}
                ${inspectedRole === 'WOLF' ? 'shadow-[inset_0_0_20px_rgba(255,0,0,0.2)] border-danger/50' : ''}
                ${inspectedRole && inspectedRole !== 'WOLF' ? 'shadow-[inset_0_0_20px_rgba(0,255,0,0.2)] border-green-500/50' : ''}
                ${className}
            `}
            onClick={() => canInteract && handleSelect(player.id)}
        >
            {/* Top Bar: Player Name & Status */}
            <div className={`p-2 border-b border-current flex justify-between items-center text-[10px] font-mono tracking-wider ${isSelected ? 'border-black' : 'border-[#333]'}`}>
                <span className="truncate max-w-[80px] font-bold">{player.name} {isMe && `(${t('you')})`}</span>
                 {/* Ready Status */}
                 {phase === 'WAITING' && (
                    <span className={player.isReady ? 'text-accent' : 'text-[#444]'}>
                        {player.isReady ? t('ready_short') : t('not_ready_short')}
                    </span>
                )}
            </div>

            {/* Main Content Area */}
            <div className="flex-1 relative flex items-center justify-center p-2">
                {/* PERSISTENT PLAYER NUMBER BADGE */}
                <div className="absolute top-0 right-0 z-50 bg-black text-white text-xs font-mono font-bold px-1.5 py-0.5 border-l border-b border-white shadow-sm select-none">
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
                        <div className="text-sm md:text-xl font-bold uppercase tracking-widest leading-none">
                            {/* Translate Role */}
                            {roleKey ? t(`roles.${roleKey}`, roleKey) : t('unknown_role')}
                        </div>
                         {isDead && <div className="text-danger font-mono text-[10px] bg-black px-1 mt-1">{t('deceased')}</div>}
                    </div>
                ) : (
                    // --- BACK (Hidden / Number) ---
                    <div className="w-full h-full flex items-center justify-center relative">
                        {/* Player Number (Avatar ID as visual identifier) */}
                        <div className="font-mono text-4xl md:text-6xl font-bold opacity-20 select-none">
                            {String(player.avatar || '00').padStart(2, '0')}
                        </div>
                        
                        {/* Tap to Reveal Overlay for Self */}
                        {isMe && !isDead && (
                             <div className="absolute inset-0 z-30 flex flex-col items-center justify-center transition-colors cursor-pointer"
                                 onClick={(e) => { e.stopPropagation(); setIsRevealed(true); }}
                             >
                                <div className="bg-[#222] border border-[#444] px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
                                     <span className="text-[10px] font-mono tracking-wider">{t('reveal')}</span>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Badges / Overlays */}
         
            
            {/* Victim Badge (Witch Vision) */}
            {isVictim && <div className="absolute top-0 left-0 bg-purple-600 text-white text-[9px] font-bold px-1 py-0.5 z-20 animate-pulse shadow-lg">{t('victim')}</div>}
            
            {/* Host Badge - Bottom Right */}
            {player.id === hostId && (
                 <div className="absolute bottom-2 right-2 bg-accent text-black text-[8px] px-1 font-bold border border-black z-20">
                     {t('host')}
                 </div>
            )}
            
            {/* Inspected Faction Badge (Seer Vision) - Replaces basic 'scanned' or accompanies it? User asked for Good/Bad. */}
            {/* We overlay this CLEARLY on top if inspected */}
            {inspectedRole && (
                <div className={`
                    absolute top-0 left-0 text-white text-[9px] font-bold px-1 z-30 shadow-md border
                    ${inspectedRole === 'WOLF' ? 'bg-danger border-white' : 'bg-green-600 border-white'}
                `}>
                    {inspectedRole === 'WOLF' ? t('identity_bad') : t('identity_good')}
                </div>
            )}

             {/* Voting Indicator */}
             {player.isVoting && phase === 'DAY_VOTE' && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40">
                     <div className="bg-black text-white text-[10px] font-bold px-2 py-1 border border-white -rotate-12 shadow-[4px_4px_0px_var(--color-danger)]">
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
                        <div key={wolfId} className="absolute bottom-1 right-1 z-40 animate-bounce">
                           <div className="bg-red-600 text-white text-[8px] font-bold px-1 border border-black shadow-sm">
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
