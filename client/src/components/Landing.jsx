import React, { useState, useEffect } from 'react';
import { socket } from '../socket';
import { useTranslation } from 'react-i18next';

export default function Landing() {
    const { t, i18n } = useTranslation();
    const [name, setName] = useState('');
    const [roomId, setRoomId] = useState('');
    const [latestRoom, setLatestRoom] = useState(null);
    const [error, setError] = useState('');
    const [view, setView] = useState('home'); // 'home', 'host', 'manual'
    
    // Game Settings State
    const [gameConfig, setGameConfig] = useState({
        wolves: 2,
        seer: true,
        witch: true,
        winCondition: 'wipeout'
    });

    const toggleLanguage = () => {
        const newLang = i18n.language === 'zh' ? 'en' : 'zh';
        i18n.changeLanguage(newLang);
    };

    useEffect(() => {
        // Parse URL params
        const params = new URLSearchParams(window.location.search);
        const roomParam = params.get('room');
        if (roomParam) {
            setRoomId(roomParam.toUpperCase());
            setView('manual'); // Go straight to manual join view if room provided
        }

        // Random Name
        const randomId = Math.floor(Math.random() * 9000) + 1000;
        setName(`Player ${randomId}`);

        // Socket Connection for Discovery
        if (!socket.connected) socket.connect();

        function onLatestRoom({ roomId }) {
            setLatestRoom(roomId);
        }

        socket.on('latest_room', onLatestRoom);
        return () => {
            socket.off('latest_room', onLatestRoom);
        };
    }, []);

    const handleCreate = () => {
        if (!name) return setError(t('error') + ': Please enter your name'); 
        if (!socket.connected) socket.connect();
        socket.emit('create_game', { name, config: gameConfig });
    };

    const handleJoin = (targetRoomId) => {
        const roomToJoin = targetRoomId || roomId;
        if (!name) return setError(t('error') + ': Please enter your name');
        if (!roomToJoin) return setError(t('error') + ': Please enter a Room ID');
        
        if (!socket.connected) socket.connect();
        socket.emit('join_game', { roomId: roomToJoin, name });
    };

    return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 bg-bg text-ink relative overflow-hidden transition-colors duration-500">
            {/* Minimal Ambient Background */}
            <div className="absolute inset-0 z-0 bg-gradient-to-b from-transparent via-bg to-bg opacity-80" />
            
            {/* Language Switcher - Very subtle */}
            <button 
                onClick={toggleLanguage}
                className="absolute top-6 right-6 z-50 text-[10px] font-medium text-muted hover:text-ink transition-colors uppercase tracking-widest"
            >
                {i18n.language === 'zh' ? 'EN / 中' : '中 / EN'}
            </button>

            <div className="w-full max-w-sm z-10 flex flex-col items-center gap-8 animate-in fade-in zoom-in duration-500">
                
                {/* 1. Brand / Identity */}
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

                {/* 2. Dynamic Content Area */}
                <div className="w-full transition-all duration-300 min-h-[200px] flex flex-col justify-center">
                    
                    {/* VIEW: HOME (Default) */}
                    {view === 'home' && (
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
                    )}

                    {/* VIEW: HOST */}
                    {view === 'host' && (
                        <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-right-4">
                            <div className="bg-surface/30 backdrop-blur-sm p-5 rounded-[var(--radius-lg)] border border-white/5 space-y-4">
                                {/* Presets */}
                                <div className="grid grid-cols-3 gap-2">
                                     {[6, 9, 12].map(num => (
                                         <button 
                                            key={num}
                                            className="py-1.5 text-[10px] font-medium rounded bg-black/20 border border-transparent hover:border-primary/50 hover:text-primary transition-all text-muted"
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
                                 <div className="flex justify-between items-center px-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-muted">Wolves</span>
                                        <div className="flex items-center bg-black/20 rounded">
                                            <button className="px-2 hover:text-white text-muted" onClick={() => setGameConfig(p => ({...p, wolves: Math.max(1, p.wolves - 1)}))}>-</button>
                                            <span className="text-xs font-mono">{gameConfig.wolves}</span>
                                            <button className="px-2 hover:text-white text-muted" onClick={() => setGameConfig(p => ({...p, wolves: p.wolves + 1}))}>+</button>
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <button className={`w-2 h-2 rounded-full ${gameConfig.seer ? 'bg-primary shadow-[0_0_5px_currentColor]' : 'bg-muted/20'}`} onClick={() => setGameConfig(p=>({...p, seer: !p.seer}))} />
                                        <button className={`w-2 h-2 rounded-full ${gameConfig.witch ? 'bg-purple-500 shadow-[0_0_5px_currentColor]' : 'bg-muted/20'}`} onClick={() => setGameConfig(p=>({...p, witch: !p.witch}))} />
                                    </div>
                                 </div>
                            </div>
                            
                            <button className="btn-primary" onClick={handleCreate}>{t('create_new_game')}</button>
                            <button className="text-[10px] uppercase tracking-widest text-muted hover:text-ink text-center mt-2" onClick={() => setView('home')}>{t('cancel')}</button>
                        </div>
                    )}

                    {/* VIEW: MANUAL */}
                    {view === 'manual' && (
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
                    )}

                </div>

                {error && (
                    <div className="text-danger text-[10px] tracking-wide text-center animate-in fade-in slide-in-from-top-1 bg-danger/10 px-3 py-1 rounded">
                        {error}
                    </div>
                )}
            </div>
            
            {/* Minimal Footer */}
            <div className="absolute bottom-6 text-[9px] text-muted/20 uppercase tracking-[0.3em]">
                Local Network v1.1
            </div>
        </div>
    );
}
