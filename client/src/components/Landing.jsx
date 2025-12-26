import React, { useState, useEffect } from 'react';
import { socket } from '../socket';
import { useTranslation } from 'react-i18next';

export default function Landing() {
    const { t, i18n } = useTranslation();
    const [name, setName] = useState('');
    const [roomId, setRoomId] = useState('');
    const [error, setError] = useState('');
    
    // Game Settings State
    const [showSettings, setShowSettings] = useState(false);
    const [gameConfig, setGameConfig] = useState({
        wolves: 2,
        seer: true,
        witch: true,
        winCondition: 'wipeout' // Default to Wipeout (屠城) for safety/simple games
    });

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
        if (!name) return setError(t('error') + ': Please enter your name'); 
        
        socket.connect();
        socket.emit('create_game', { name, config: gameConfig });
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
            {/* Background Container - Clean minimalist background */}
            <div className="absolute inset-0 bg-bg z-0 pointer-events-none"></div>

            
            <div className="relative w-full max-w-md h-full md:h-auto p-6 md:p-8 flex flex-col items-center justify-center gap-6 z-10 animate-fade-in">


                {/* Language Switcher */}
                <button 
                    onClick={toggleLanguage}
                    className="absolute top-6 right-6 z-50 btn-ghost text-xs"
                >
                    {i18n.language === 'zh' ? 'EN / 中' : '中 / EN'}
                </button>

                <div className="w-full z-10 space-y-8">
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-center mb-8 text-text-primary">
                        WEREWOLF
                    </h1>

                    <div className="flex flex-col gap-5">
                        <div>
                            <label className="text-sm font-medium text-text-secondary mb-2 block">{t('identity')}</label>
                            <input
                                type="text"
                                placeholder={t('enter_name')}
                                className="input-primary"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>

                        {/* Settings Panel for Create Game */}
                        <div className="bg-[#1a1a1a] border border-[#333] p-2.5 text-xs mb-2.5">
                            <div className="flex items-center justify-between font-mono text-[#666] mb-2 cursor-pointer" onClick={() => setShowSettings(!showSettings)}>
                                <span>{t('settings')}</span>
                                <span>{showSettings ? '-' : '+'}</span>
                            </div>
                            
                            {showSettings && (
                                <div className="space-y-4 mt-2 pt-2 border-t border-[#333]">
                                     {/* Presets */}
                                     <div className="flex gap-2">
                                         {[6, 9, 12].map(num => (
                                             <button 
                                                key={num}
                                                className="flex-1 bg-[#333] hover:bg-[#444] text-[10px] py-1 text-white border border-transparent hover:border-white transition-all"
                                                onClick={() => {
                                                    if (num === 6) setGameConfig({ wolves: 2, seer: true, witch: true, winCondition: 'wipeout' });
                                                    if (num === 9) setGameConfig({ wolves: 3, seer: true, witch: true, winCondition: 'side_kill' });
                                                    if (num === 12) setGameConfig({ wolves: 4, seer: true, witch: true, winCondition: 'side_kill' });
                                                }}
                                             >
                                                 {num} {t('players')}
                                             </button>
                                         ))}
                                     </div>

                                     {/* Win Condition */}
                                     <div className="flex flex-col gap-1">
                                         <label className="text-[#888] mb-1">{t('win_condition')}</label>
                                         <div className="flex gap-2">
                                             <button 
                                                 className={`flex-1 py-1 text-[10px] border ${gameConfig.winCondition === 'side_kill' ? 'bg-white text-black border-white' : 'bg-black text-[#666] border-[#333]'}`}
                                                 onClick={() => setGameConfig(p => ({...p, winCondition: 'side_kill'}))}
                                             >
                                                 {t('side_kill')} (屠边)
                                             </button>
                                             <button 
                                                 className={`flex-1 py-1 text-[10px] border ${gameConfig.winCondition === 'wipeout' ? 'bg-white text-black border-white' : 'bg-black text-[#666] border-[#333]'}`}
                                                 onClick={() => setGameConfig(p => ({...p, winCondition: 'wipeout'}))}
                                             >
                                                 {t('wipeout')} (屠城)
                                             </button>
                                         </div>
                                     </div>

                                     {/* Roles */}
                                     <div className="space-y-2 pt-2 border-t border-[#333]"> 
                                         <div className="flex items-center justify-between">
                                             <label className="text-[#888]">Wolves: {gameConfig.wolves}</label>
                                             <div className="flex gap-1">
                                                 <button className="px-2 py-0.5 bg-[#333] hover:bg-[#444] text-white" onClick={() => setGameConfig(p => ({...p, wolves: Math.max(1, p.wolves - 1)}))}>-</button>
                                                 <button className="px-2 py-0.5 bg-[#333] hover:bg-[#444] text-white" onClick={() => setGameConfig(p => ({...p, wolves: p.wolves + 1}))}>+</button>
                                             </div>
                                         </div>
                                         <div className="flex items-center gap-2">
                                             <input 
                                                 type="checkbox" 
                                                 checked={gameConfig.seer} 
                                                 onChange={e => setGameConfig(p => ({...p, seer: e.target.checked}))}
                                             />
                                             <label className="text-[#888]">Seer ({t('roles.SEER')})</label>
                                         </div>
                                         <div className="flex items-center gap-2">
                                             <input 
                                                 type="checkbox" 
                                                 checked={gameConfig.witch} 
                                                 onChange={e => setGameConfig(p => ({...p, witch: e.target.checked}))}
                                             />
                                             <label className="text-[#888]">Witch ({t('roles.WITCH')})</label>
                                         </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <button className="btn-primary" onClick={handleCreate}>
                            {t('create_new_game')}
                        </button>

                        <div className="flex items-center gap-4 opacity-30 my-2">
                            <div className="flex-1 h-[1px] bg-white"></div>
                            <span className="text-xs text-white  uppercase tracking-widest">{t('or_join_existing')}</span>
                            <div className="flex-1 h-[1px] bg-white"></div>
                        </div>

                        <div className="flex gap-3">
                             <input
                                type="text"
                                placeholder={t('room_id')}
                                className="input-primary flex-1"
                                value={roomId}
                                onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                            />
                            <button className="btn-secondary w-auto whitespace-nowrap" onClick={handleJoin}>
                                {t('join')}
                            </button>
                        </div>
                    </div>
                    {error && <div className="text-danger mt-4 text-center text-sm bg-danger/10 p-3 rounded-lg border border-danger/20">{error}</div>}
                </div>
            </div>
        </div>
    );
}
