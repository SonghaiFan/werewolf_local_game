import React, { useState, useEffect } from 'react';
import { socket } from '../socket';
import { useTranslation } from 'react-i18next';

export default function Landing() {
    const { t, i18n } = useTranslation();
    const [name, setName] = useState('');
    const [roomId, setRoomId] = useState('');
    const [error, setError] = useState('');

    const toggleLanguage = () => {
        const newLang = i18n.language === 'zh' ? 'en' : 'zh';
        i18n.changeLanguage(newLang);
    };

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const roomParam = params.get('room');
        if (roomParam) {
            setRoomId(roomParam.toUpperCase());
        }

        const randomId = Math.floor(Math.random() * 9000) + 1000;
        setName(`Player ${randomId}`);
    }, []);

    const handleCreate = () => {
        if (!name) return setError(t('error') + ': Please enter your name'); // Partial translation for simplicity on input errors or full?
        // Let's keep input errors simple for now or generic. 
        // Actually "Please enter your name" is static.
        socket.connect();
        socket.emit('create_game', { name });
    };

    const handleJoin = () => {
        if (!name) return setError(t('error') + ': Please enter your name');
        if (!roomId) return setError(t('error') + ': Please enter a Room ID');
        socket.connect();
        socket.emit('join_game', { roomId, name });
    };

    return (
        <div className="werewolf-app">
            {/* Background effects from GameRoom for consistency */}
            <div className="grain-overlay">
                <svg width="100%" height="100%">
                    <filter id="photocopy-noise">
                        <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
                        <feColorMatrix type="matrix" values="0 0 0 0 0, 0 0 0 0 0, 0 0 0 0 0, 0 0 0 1 0" />
                        <feComponentTransfer>
                            <feFuncA type="table" tableValues="0 0.5" />
                        </feComponentTransfer>
                    </filter>
                    <rect width="100%" height="100%" filter="url(#photocopy-noise)" />
                </svg>
            </div>
            
            <div className="photostat-root relative w-full h-full p-10 flex flex-col items-center justify-center gap-5 contrast-125 brightness-110 z-10">
                <div className="scanline"></div>
                <div className="photocopy-texture"></div>

                {/* Language Switcher */}
                <button 
                    onClick={toggleLanguage}
                    className="absolute top-5 right-5 z-50 btn-brutal bg-black text-white border-white text-xs px-2 py-1 hover:bg-white hover:text-black transition-colors"
                >
                    {i18n.language === 'zh' ? 'EN / 中' : '中 / EN'}
                </button>

                <div className="max-w-[400px] w-full z-10">
                    <div className="status-tag bg-accent text-black inline-block px-3 py-1 font-mono font-bold text-sm uppercase mb-2.5 [clip-path:polygon(0_0,95%_0,100%_100%,5%_100%)]">
                        {t('system_ready')}
                    </div>
                    <h1 className="game-title glitch-text text-8xl leading-[0.8] tracking-tighter uppercase mix-blend-difference m-0 text-center mb-10 text-[clamp(3rem,10vw,6rem)]">
                        WERE
                    </h1>

                    <div className="flex flex-col gap-5">
                        <div>
                            <label className="font-mono text-xs text-[#666] mb-1.5 block">{t('identity')}</label>
                            <input
                                type="text"
                                placeholder={t('enter_name')}
                                className="input-brutal"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>

                        <button className="btn-brutal btn-start" onClick={handleCreate}>
                            {t('create_new_game')}
                        </button>

                        <div className="flex items-center gap-2.5 opacity-50">
                            <div className="flex-1 h-[1px] bg-[#333]"></div>
                            <span className="font-mono text-xs">{t('or_join_existing')}</span>
                            <div className="flex-1 h-[1px] bg-[#333]"></div>
                        </div>

                        <div className="flex gap-2.5">
                             <input
                                type="text"
                                placeholder={t('room_id')}
                                className="input-brutal flex-1"
                                value={roomId}
                                onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                            />
                            <button className="btn-brutal w-auto bg-white text-black" onClick={handleJoin}>
                                {t('join')}
                            </button>
                        </div>
                    </div>
                    {error && <p className="text-danger mt-5 font-mono text-center border border-danger p-2.5">{error}</p>}
                </div>
            </div>
        </div>
    );
}
