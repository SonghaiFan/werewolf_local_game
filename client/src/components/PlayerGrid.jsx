import React from 'react';
import AvatarCard from './AvatarCard';

export default function PlayerGrid({ players }) {
    // Context is used inside AvatarCard, so we don't need to pass global state here.
    return (
        <>
            {Object.values(players).map(player => (
                <AvatarCard 
                    key={player.id}
                    player={player}
                    className="md:min-h-[200px]"
                />
            ))}
        </>
    );
}
