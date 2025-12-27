import React from 'react';
import GameSettings from '../GameSettings';

export default function HostView({ t, gameConfig, setGameConfig, handleCreate, setView }) {
    return (
        <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-right-4">
            <div className="bg-surface/30 backdrop-blur-sm p-5 rounded-[var(--radius-lg)] border border-border/50">
                <GameSettings 
                    t={t} 
                    gameConfig={gameConfig} 
                    setGameConfig={setGameConfig} 
                />
            </div>

            <button className="btn-primary" onClick={handleCreate}>{t('create_new_game')}</button>
            <button className="text-[10px] uppercase tracking-widest text-muted hover:text-ink text-center mt-2" onClick={() => setView('home')}>{t('cancel')}</button>
        </div>
    );
}

