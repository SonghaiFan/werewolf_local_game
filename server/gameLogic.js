const MOVES = {
    ROCK: 'rock',
    PAPER: 'paper',
    SCISSORS: 'scissors'
};

const RESULTS = {
    WIN: 'win',
    LOSE: 'lose',
    DRAW: 'draw'
};

function determineWinner(move1, move2) {
    if (move1 === move2) return RESULTS.DRAW;

    if (
        (move1 === MOVES.ROCK && move2 === MOVES.SCISSORS) ||
        (move1 === MOVES.PAPER && move2 === MOVES.ROCK) ||
        (move1 === MOVES.SCISSORS && move2 === MOVES.PAPER)
    ) {
        return RESULTS.WIN; // Player 1 wins
    }

    return RESULTS.LOSE; // Player 1 loses (Player 2 wins)
}

module.exports = {
    MOVES,
    RESULTS,
    determineWinner
};
