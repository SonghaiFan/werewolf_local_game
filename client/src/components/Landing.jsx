import React, { useState, useEffect } from 'react';
import { socket } from '../socket';
import { useTranslation } from 'react-i18next';
import HomeView from './landing/HomeView';
import HostView from './landing/HostView';
import ManualJoinView from './landing/ManualJoinView';
import RejoinLoading from './landing/RejoinLoading';
import LandingHeader from './landing/LandingHeader';

export default function Landing() {
    const { t, i18n } = useTranslation();
    const [name, setName] = useState('');
    const [roomId, setRoomId] = useState('');
    const [latestRoom, setLatestRoom] = useState(null);
    const [error, setError] = useState('');
    const [view, setView] = useState('home'); // 'home', 'host', 'manual'
    const [isRejoining, setIsRejoining] = useState(false);
    
    // Game Settings State
    const [gameConfig, setGameConfig] = useState({
        wolves: 2,
        seer: true,
        witch: true,
        guard: true,
        winCondition: 'wipeout'
    });

    const toggleLanguage = () => {
        const newLang = i18n.language === 'zh' ? 'en' : 'zh';
        i18n.changeLanguage(newLang);
    };

    useEffect(() => {
        // Auto-Rejoin Logic
        const storedRoom = sessionStorage.getItem('werewolf_room');
        const storedPid = sessionStorage.getItem('werewolf_pid');
        
        if (storedRoom && storedPid) {
            setIsRejoining(true);
            if (!socket.connected) socket.connect();
            
            const attemptRejoin = () => {
                console.log(`[Landing] Attempting auto-rejoin to ${storedRoom} with PID ${storedPid}`);
                socket.emit('join_game', { roomId: storedRoom, name: 'Rejoining...', pid: storedPid });
            };
            
            if (socket.connected) attemptRejoin();
            else socket.once('connect', attemptRejoin);
            
            // Fallback timeout if stuck
            setTimeout(() => setIsRejoining(false), 5000);
        }

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

    if (isRejoining) {
        return <RejoinLoading t={t} roomId={sessionStorage.getItem('werewolf_room')} />;
    }

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
        <div className="h-[100dvh] w-full flex flex-col items-center justify-center p-6 bg-bg text-ink relative overflow-hidden transition-colors duration-500">
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
                <LandingHeader t={t} name={name} setName={setName} />

                {/* 2. Dynamic Content Area */}
                <div className="w-full transition-all duration-300 min-h-[200px] flex flex-col justify-center">
                    {view === 'home' && (
                        <HomeView t={t} latestRoom={latestRoom} handleJoin={handleJoin} setView={setView} />
                    )}
                    {view === 'host' && (
                        <HostView t={t} gameConfig={gameConfig} setGameConfig={setGameConfig} handleCreate={handleCreate} setView={setView} />
                    )}
                    {view === 'manual' && (
                        <ManualJoinView t={t} roomId={roomId} setRoomId={setRoomId} handleJoin={handleJoin} setView={setView} />
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
