import React, { useState } from 'react';
import { socket } from '../socket';

export default function Landing() {
    const [name, setName] = useState('');
    const [roomId, setRoomId] = useState('');
    const [error, setError] = useState('');

    const handleCreate = () => {
        if (!name) return setError('Please enter your name');
        socket.connect();
        socket.emit('create_game', { name });
    };

    const handleJoin = () => {
        if (!name) return setError('Please enter your name');
        if (!roomId) return setError('Please enter a Room ID');
        socket.connect();
        socket.emit('join_game', { roomId, name });
    };

    return (
        <div className="card">
            <h1>Rock Paper Scissors</h1>
            <div style={{ marginBottom: '20px' }}>
                <input
                    type="text"
                    placeholder="Enter your name"
                    className="input-field"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button className="btn-primary" onClick={handleCreate}>Create New Game</button>
                
                <div style={{ margin: '10px 0', opacity: 0.7 }}>OR</div>
                
                <div style={{ map: '10px' }}>
                     <input
                        type="text"
                        placeholder="Room ID"
                        className="input-field"
                        style={{ marginBottom: '10px' }}
                        value={roomId}
                        onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                    />
                    <button onClick={handleJoin} style={{ width: '100%' }}>Join Existing Game</button>
                </div>
            </div>
            {error && <p style={{ color: '#ff6b6b', marginTop: '10px' }}>{error}</p>}
        </div>
    );
}
