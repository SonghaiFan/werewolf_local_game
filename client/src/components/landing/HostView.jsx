import React from 'react';
import { RoleIcons } from '../RoleIcons';

export default function HostView({ t, gameConfig, setGameConfig, handleCreate, setView }) {
    return (
        <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-right-4">
            <div className="bg-surface/30 backdrop-blur-sm p-5 rounded-[var(--radius-lg)] border border-white/5 space-y-6">
                {/* Presets */}
                <div className="grid grid-cols-3 gap-2">
                    {[6, 9, 12].map(num => (
                        <button
                            key={num}
                            className="py-1.5 text-[10px] font-black rounded-lg bg-black/20 border border-transparent hover:border-primary/50 hover:text-primary transition-all text-muted/60 uppercase"
                            onClick={() => {
                                if (num === 6) setGameConfig({ wolves: 2, seer: true, witch: true, winCondition: 'wipeout' });
                                if (num === 9) setGameConfig({ wolves: 3, seer: true, witch: true, winCondition: 'side_kill' });
                                if (num === 12) setGameConfig({ wolves: 4, seer: true, witch: true, winCondition: 'side_kill' });
                            }}
                        >
                            {num} P
                        </button>
                    ))}
                </div>

                {/* Configs */}
                <div className="space-y-6">
                    <div className="flex justify-between items-end px-1">
                        {/* Wolves Counter */}
                        <div className="flex flex-col gap-1.5">
                            <span className="text-[10px] font-black uppercase tracking-widest text-muted/60">{t('wolves')}</span>
                            <div className="flex items-center bg-black/20 rounded-xl p-0.5 border border-white/5">
                                <button className="w-8 h-8 flex items-center justify-center hover:text-white text-muted transition-colors rounded-lg" onClick={() => setGameConfig(p => ({ ...p, wolves: Math.max(1, p.wolves - 1) }))}>-</button>
                                <span className="w-8 text-center text-sm font-mono font-bold">{gameConfig.wolves}</span>
                                <button className="w-8 h-8 flex items-center justify-center hover:text-white text-muted transition-colors rounded-lg" onClick={() => setGameConfig(p => ({ ...p, wolves: p.wolves + 1 }))}>+</button>
                            </div>
                        </div>

                        {/* Role Toggles - Using Icons */}
                        <div className="flex gap-5 pb-1">
                            <button
                                className="flex flex-col items-center gap-2 group transition-all"
                                onClick={() => setGameConfig(p => ({ ...p, seer: !p.seer }))}
                            >   
                                <span className={`text-[9px] font-black uppercase tracking-widest transition-colors ${gameConfig.seer ? 'text-primary' : 'text-muted/30'}`}>
                                    {t('roles.SEER')}
                                </span>
                                <div className={`w-8 h-8 p-1.5 rounded-xl transition-all duration-300 border flex items-center justify-center ${gameConfig.seer ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' : 'bg-black/20 border-white/5 text-muted/30'}`}>
                                    {RoleIcons.SEER}
                                </div>

                            </button>
                            <button
                                className="flex flex-col items-center gap-2 group transition-all"
                                onClick={() => setGameConfig(p => ({ ...p, witch: !p.witch }))}
                            >
                                <span className={`text-[9px] font-black uppercase tracking-widest transition-colors ${gameConfig.witch ? 'text-purple-500' : 'text-muted/30'}`}>
                                    {t('roles.WITCH')}
                                </span>
                                <div className={`w-8 h-8 p-1.5 rounded-xl transition-all duration-300 border flex items-center justify-center ${gameConfig.witch ? 'bg-purple-500 border-purple-500 text-white shadow-lg shadow-purple-500/20' : 'bg-black/20 border-white/5 text-muted/30'}`}>
                                    {RoleIcons.WITCH}
                                </div>

                            </button>
                        </div>
                    </div>

                    {/* Win Condition Selection */}
                    <div className="flex flex-col gap-3 pt-4 border-t border-white/5">
                        <div className="flex justify-between items-center px-1">
                            <span className="text-[10px] font-black uppercase tracking-widest text-muted/60">{t('win_condition')}</span>
                            <span className="text-[9px] text-muted/40 font-medium italic">
                                {gameConfig.winCondition === 'side_kill' ? t('side_kill_desc', 'Kill all Gods OR all Villagers') : t('wipeout_desc', 'Kill all Good players')}
                            </span>
                        </div>
                        <div className="flex bg-black/20 rounded-xl p-1 border border-white/5">
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

            <button className="btn-primary" onClick={handleCreate}>{t('create_new_game')}</button>
            <button className="text-[10px] uppercase tracking-widest text-muted hover:text-ink text-center mt-2" onClick={() => setView('home')}>{t('cancel')}</button>
        </div>
    );
}
