import React from 'react';

export default function LandingHeader({ t, name, setName }) {
    return (
        <div className="text-center w-full">
            <h1 className="text-4xl font-black tracking-tighter mb-8 opacity-90" style={{ fontFamily: 'var(--font-heading)' }}>
                WEREWOLF
            </h1>
            
            {/* Name Input - Always visible, clean interaction */}
            <div className="relative group w-full max-w-[200px] mx-auto">
                <input
                    type="text"
                    placeholder={t('enter_name')}
                    className="w-full bg-transparent border-b border-border/50 text-center text-lg py-2 focus:border-primary outline-none transition-all placeholder:text-muted/30"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                />
                 <div className="absolute inset-x-0 bottom-0 h-[1px] bg-primary scale-x-0 group-focus-within:scale-x-100 transition-transform duration-300" />
            </div>
        </div>
    );
}
