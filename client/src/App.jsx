import React, { useState, useEffect } from 'react';
import Landing from './components/Landing';
import GameRoom from './components/GameRoom';
import { socket } from './socket';

function App() {
  const [roomId, setRoomId] = useState(null);
  const [myId, setMyId] = useState(null);
  const [inGame, setInGame] = useState(false);
  const [serverIP, setServerIP] = useState(null);

  useEffect(() => {
    function onConnect() {
      setMyId(socket.id);
    }

    function onDisconnect() {
      setInGame(false);
      setRoomId(null);
    }

    function onGameCreated({ roomId }) {
      setRoomId(roomId);
      setInGame(true);
    }

  }, []);
  
  useEffect(() => {
       socket.on('connect', () => setMyId(socket.id));
       socket.on('disconnect', () => { setInGame(false); setRoomId(null); });
       
       socket.on('game_created', ({ roomId }) => {
           setRoomId(roomId);
           setInGame(true);
       });
       
       socket.on('game_state', (state) => {
           if (state.id) {
               setRoomId(state.id);
               setInGame(true);
           }
       });
       
       socket.on('server_config', ({ ip }) => {
            console.log('[App] Received Server IP:', ip);
            setServerIP(ip);
       });

       socket.on('error', (alertMsg) => alert(alertMsg));
       
       return () => {
           socket.off('connect');
           socket.off('disconnect');
           socket.off('game_created');
           socket.off('game_state');
           socket.off('server_config');
           socket.off('error');
       }
  }, []);

  const handleExit = () => {
      setInGame(false);
      setRoomId(null);
  };

  return (
    <div>
      {!inGame ? (
        <Landing />
      ) : (
        <GameRoom 
            roomId={roomId} 
            myId={myId || socket.id} 
            onExit={handleExit} 
            serverIP={serverIP}
        />
      )}
    </div>
  );
}

export default App;

