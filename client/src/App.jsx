import React, { useState, useEffect } from 'react';
import Landing from './components/Landing';
import GameRoom from './components/GameRoom';
import { socket } from './socket';

function App() {
  const [roomId, setRoomId] = useState(null);
  const [myId, setMyId] = useState(null);
  const [inGame, setInGame] = useState(false);

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

    // When we join, we just enter the room component, it will fetch state.
    // The server emits 'game_joined' (from old code) or we rely on 'game_state' in GameRoom.
    // NOTE: In server.js we do emit 'game_state' immediately on join.
    // We still need to know WHEN to switch the view.
    // The server currently emits:
    // create_game -> game_created
    // join_game -> game_state (via broadcast) AND NOT game_joined anymore.
    // Wait, checked server.js:
    // join_game handler -> emits `game_state` via broadcastState. DOES NOT emit `game_joined`.
    // So we need to listen for `game_state` here to switch?
    // OR we can just add a confirmation emit in server for join_game success relative to the joiner.
    // BUT, since we broadcast state, receiving `game_state` is a good indicator of success.
    // Let's listen for `game_state` here as a signal to enter game if not in game.
    
    // Actually, `broadcastState` sends `game_state` to everyone in room.
    // If I just joined, I will get `game_state`.
  }, []);
  
  // Re-implementing effect for clarity
  useEffect(() => {
       socket.on('connect', () => setMyId(socket.id));
       socket.on('disconnect', () => { setInGame(false); setRoomId(null); });
       
       socket.on('game_created', ({ roomId }) => {
           setRoomId(roomId);
           setInGame(true);
       });
       
       // Detect join via state update
       socket.on('game_state', (state) => {
           if (state.id) {
               setRoomId(state.id);
               setInGame(true);
           }
       });
       
       socket.on('error', (alertMsg) => alert(alertMsg));
       
       return () => {
           socket.off('connect');
           socket.off('disconnect');
           socket.off('game_created');
           socket.off('game_state');
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
        />
      )}
    </div>
  );
}

export default App;

