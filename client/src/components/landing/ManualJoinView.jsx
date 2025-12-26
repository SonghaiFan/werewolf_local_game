import React from 'react';

export default function ManualJoinView({ t, roomId, setRoomId, handleJoin, setView }) {
    return (
        <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-right-4">
            <input
                type="text"
                placeholder={t('room_id')}
                className="input-primary text-center font-mono text-2xl uppercase placeholder:text-base placeholder:font-sans"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                autoFocus
            />
            <button className="btn-primary" onClick={() => handleJoin()}>
                {t('join')}
            </button>
            <button className="text-[10px] uppercase tracking-widest text-muted hover:text-ink text-center mt-2" onClick={() => setView('home')}>{t('cancel')}</button>
        </div>
    );
}
