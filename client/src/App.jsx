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
       socket.on('connect', () => {
           setMyId(socket.id);
       });
       
       socket.on('disconnect', () => { 
           setInGame(false); 
           setRoomId(null); 
           // Note: We keep localStorage intact for reconnection
       });
       
       const saveSession = (rid, pid) => {
           localStorage.setItem('werewolf_room', rid);
           localStorage.setItem('werewolf_pid', pid);
           setRoomId(rid);
           setMyId(pid); // Use PID as the permanent ID for game logic
           setInGame(true);
       };

       socket.on('game_created', ({ roomId, pid }) => {
           saveSession(roomId, pid);
       });

       socket.on('joined_success', ({ roomId, pid }) => {
           saveSession(roomId, pid);
       });
       
       socket.on('game_state', (state) => {
           if (state.id) {
               setRoomId(state.id);
               // Re-sync PID if needed? Usually App set it via joined_success
               setInGame(true);
           }
       });
       
       socket.on('server_config', ({ ip }) => {
            console.log('[App] Received Server IP:', ip);
            setServerIP(ip);
       });

       socket.on('error', (alertMsg) => {
           alert(alertMsg);
           // If it's a "not found" error, clear the local stale session
           if (alertMsg === 'Room not found') {
               localStorage.removeItem('werewolf_room');
               localStorage.removeItem('werewolf_pid');
               setInGame(false);
           }
       });
       
       return () => {
           socket.off('connect');
           socket.off('disconnect');
           socket.off('game_created');
           socket.off('joined_success');
           socket.off('game_state');
           socket.off('server_config');
           socket.off('error');
       }
  }, []);

  const handleExit = () => {
      localStorage.removeItem('werewolf_room');
      localStorage.removeItem('werewolf_pid');
      setInGame(false);
      setRoomId(null);
      window.location.reload();
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

