import React, { createContext, useContext } from 'react';

const GameContext = createContext();

export const useGameContext = () => useContext(GameContext);

export default GameContext;
