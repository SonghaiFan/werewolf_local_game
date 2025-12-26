const { WerewolfGame, ROLES, PHASES } = require('./server/game');

try {
    console.log('Loading WerewolfGame...');
    const game = new WerewolfGame('test_room', 'host_123');
    console.log('Game initialized.');
    console.log('Initial Phase:', game.phase);
    
    if (game.phase !== PHASES.WAITING) throw new Error('Wrong initial phase');
    
    console.log('Adding player...');
    game.addPlayer('p1', 'Alice');
    
    console.log('Starting game (should fail - not enough players/ready)...');
    game.startGame();
    
    console.log('Test Complete: Modules loaded successfully.');
} catch (e) {
    console.error('Test Failed:', e);
    process.exit(1);
}
