import React from 'react';

export default function RejoinLoading({ t, roomId }) {
    return (
        <div className="h-[100dvh] w-full flex flex-col items-center justify-center bg-bg text-ink">
            <div className="animate-pulse text-primary tracking-[0.2em] uppercase text-xs font-bold mb-4">
                {t('room')} {roomId}
            </div>
            <div className="animate-pulse text-muted tracking-[0.2em] uppercase text-[10px]">
                Restoring Session...
            </div>
        </div>
    );
}
