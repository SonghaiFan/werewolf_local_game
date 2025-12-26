import React from 'react';

export default function HomeView({ t, latestRoom, handleJoin, setView }) {
    return (
        <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4">
            {/* Primary Action: Join Latest OR Host */}
            {latestRoom ? (
                <button 
                    className="group relative w-full py-5 bg-surface border border-white/5 rounded-[var(--radius-lg)] hover:bg-primary hover:border-primary transition-all duration-300 shadow-lg hover:shadow-primary/20 overflow-hidden"
                    onClick={() => handleJoin(latestRoom)}
                >
                    <div className="relative z-10 flex flex-col items-center gap-1">
                        <span className="text-[10px] uppercase tracking-[0.2em] opacity-60 group-hover:text-white transition-colors">Join Found Room</span>
                        <span className="text-2xl font-black tracking-tight group-hover:text-white transition-colors">{latestRoom}</span>
                    </div>
                    <div className="absolute inset-0 bg-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </button>
            ) : (
                <button 
                    className="btn-primary py-4 text-sm tracking-widest uppercase font-bold"
                    onClick={() => setView('host')}
                >
                    {t('create_new_game')}
                </button>
            )}

            {/* Secondary Actions Links */}
            <div className="flex items-center justify-center gap-6 mt-4">
                {latestRoom && (
                    <button onClick={() => setView('host')} className="text-[10px] uppercase tracking-widest text-muted hover:text-ink transition-colors">
                        {t('create_new_game')}
                    </button>
                )}
                <button onClick={() => setView('manual')} className="text-[10px] uppercase tracking-widest text-muted hover:text-ink transition-colors">
                    {t('join_with_code')}
                </button>
            </div>
        </div>
    );
}
