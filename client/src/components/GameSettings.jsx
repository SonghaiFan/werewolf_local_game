import React from 'react';
import { RoleIcons } from './RoleIcons';

export default function GameSettings({ t, gameConfig, setGameConfig, showPresets = true, className = "" }) {
    const roles = [
        { id: 'SEER', label: 'seer' },
        { id: 'WITCH', label: 'witch' },
        { id: 'GUARD', label: 'guard' },
        { id: 'HUNTER', label: 'hunter' }
    ];

    return (
        <div className={`space-y-6 ${className}`}>
            {/* Presets */}
            {showPresets && (
                <div className="grid grid-cols-3 gap-2">
                    {[6, 9, 12].map(num => (
                        <button
                            key={num}
                            className="py-1.5 text-[10px] font-black rounded-lg bg-black/20 border border-border/50 hover:border-primary/50 hover:text-primary transition-all text-muted/60 uppercase"
                            onClick={() => {
                                if (num === 6) setGameConfig({ wolves: 2, seer: true, witch: false, guard: false, hunter: false, winCondition: 'side_kill' });
                                if (num === 9) setGameConfig({ wolves: 3, seer: true, witch: true, guard: false, hunter: true, winCondition: 'wipeout' });
                                if (num === 12) setGameConfig({ wolves: 4, seer: true, witch: true, guard: true, hunter: true, winCondition: 'wipeout' });
                            }}
                        >
                            {num} P
                        </button>
                    ))}
                </div>
            )}

            {/* Configs */}
            <div className="space-y-6">
                <div className="flex justify-between items-end px-1">
                    {/* Wolves Counter */}
                    <div className="flex flex-col gap-1.5">
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted/60">{t('wolves')}</span>
                        <div className="flex items-center bg-black/20 rounded-xl p-0.5 border border-border/50">
                            <button className="w-8 h-8 flex items-center justify-center hover:text-ink text-muted transition-colors rounded-lg" onClick={() => setGameConfig(p => ({ ...p, wolves: Math.max(1, p.wolves - 1) }))}>-</button>
                            <span className="w-8 text-center text-sm font-mono font-bold text-ink">{gameConfig.wolves}</span>
                            <button className="w-8 h-8 flex items-center justify-center hover:text-ink text-muted transition-colors rounded-lg" onClick={() => setGameConfig(p => ({ ...p, wolves: p.wolves + 1 }))}>+</button>
                        </div>
                    </div>

                    {/* Role Toggles - Dynamic */}
                    <div className="flex gap-4 sm:gap-5 pb-1">
                        {roles.map(role => {
                            const isActive = gameConfig[role.id.toLowerCase()];
                            return (
                                <button
                                    key={role.id}
                                    className="flex flex-col items-center gap-2 group transition-all"
                                    onClick={() => setGameConfig(p => ({ ...p, [role.id.toLowerCase()]: !p[role.id.toLowerCase()] }))}
                                >   
                                    <span className={`text-[9px] font-black uppercase tracking-widest transition-colors ${isActive ? 'text-primary' : 'text-muted/30'}`}>
                                        {t(`roles.${role.id}`)}
                                    </span>
                                    <div className={`w-8 h-8 p-1.5 rounded-xl transition-all duration-300 border flex items-center justify-center ${isActive ? `bg-primary border-primary text-white shadow-lg shadow-primary/20` : 'bg-black/20 border-border/50 text-muted/30'}`}>
                                        {RoleIcons[role.id]}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Win Condition Selection */}
                <div className="flex flex-col gap-3 pt-4 border-t border-border/50">
                    <div className="flex justify-between items-center px-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted/60">{t('win_condition')}</span>
                        <span className="text-[9px] text-muted/40 font-medium italic">
                            {gameConfig.winCondition === 'side_kill' ? t('side_kill_desc', 'Kill all Gods OR all Villagers') : t('wipeout_desc', 'Kill all Good players')}
                        </span>
                    </div>
                    <div className="flex bg-black/20 rounded-xl p-1 border border-border/50">
                        <button
                            className={`flex-1 py-3 text-[10px] font-black rounded-lg transition-all uppercase tracking-widest ${gameConfig.winCondition === 'side_kill' ? 'bg-primary text-white shadow-xl shadow-primary/10' : 'text-muted/40 hover:text-ink hover:bg-white/5'}`}
                            onClick={() => setGameConfig(prev => ({ ...prev, winCondition: 'side_kill' }))}
                        >
                            {t('side_kill')}
                        </button>
                        <button
                            className={`flex-1 py-3 text-[10px] font-black rounded-lg transition-all uppercase tracking-widest ${gameConfig.winCondition === 'wipeout' ? 'bg-primary text-white shadow-xl shadow-primary/10' : 'text-muted/40 hover:text-ink hover:bg-white/5'}`}
                            onClick={() => setGameConfig(prev => ({ ...prev, winCondition: 'wipeout' }))}
                        >
                            {t('wipeout')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
