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
       socket.on('connect', () => {
           setMyId(socket.id);
       });
       
       socket.on('disconnect', () => { 
           setInGame(false); 
           setRoomId(null); 
           // Note: We keep localStorage intact for reconnection
       });
       
       const saveSession = (rid, pid) => {
           sessionStorage.setItem('werewolf_room', rid);
           sessionStorage.setItem('werewolf_pid', pid);
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
           console.error('[App] Error:', alertMsg);
           alert(alertMsg);
           
           // If it's a "not found" or "already in progress" error when rejoining, clear the local stale session
           const roomErrors = ['Room not found', 'Game already in progress', 'Invalid PID'];
           if (roomErrors.includes(alertMsg)) {
               sessionStorage.removeItem('werewolf_room');
               sessionStorage.removeItem('werewolf_pid');
               setInGame(false);
               setRoomId(null);
               // Re-sync with Landing by forcing it to not be in rejoining state if it was
               window.location.reload(); 
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
      sessionStorage.removeItem('werewolf_room');
      sessionStorage.removeItem('werewolf_pid');
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

