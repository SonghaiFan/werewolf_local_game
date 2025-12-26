import React from 'react';
import AvatarCard from './AvatarCard';

export default function PlayerGrid({ players, myId, selectedId, onSelect, phase, hostId, candidates }) {
    return (
        <>
            {Object.values(players).map(player => (
                <AvatarCard 
                    key={player.id}
                    player={player}
                    myId={myId}
                    isSelected={player.id === selectedId}
                    onSelect={onSelect}
                    phase={phase}
                    hostId={hostId}
                    candidates={candidates}
                    className="md:min-h-[200px]" // Pass class for height or overrides
                />
            ))}
        </>
    );
}
