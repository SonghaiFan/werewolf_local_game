const { PHASES } = require('../constants');

class ElectionManager {
    constructor() {
        this.reset();
    }

    reset() {
        this.candidates = [];
        this.votes = {};
        this.participants = []; // Track who has acted in nomination
    }

    handleNominate(game, playerId) {
        const p = game.players[playerId];
        if (!p || p.status !== 'alive') return;

        if (!this.candidates.includes(playerId)) {
            this.candidates.push(playerId);
            game.addLog(`JUDGE: ${p.name} is running for Sheriff.`);
        }
        
        if (!this.participants.includes(playerId)) {
            this.participants.push(playerId);
        }

        this.checkNominationComplete(game);
    }

    handlePass(game, playerId) {
        const p = game.players[playerId];
        if (!p || p.status !== 'alive') return;

        this.candidates = this.candidates.filter(id => id !== playerId);
        
        if (!this.participants.includes(playerId)) {
            this.participants.push(playerId);
        }

        this.checkNominationComplete(game);
    }

    checkNominationComplete(game) {
        const aliveCount = Object.values(game.players).filter(p => p.status === 'alive').length;
        if (this.participants.length >= aliveCount) {
            if (this.candidates.length > 0) {
                game.addLog(`JUDGE: Nominations closed. Candidates: ${this.candidates.map(id => game.players[id].name).join(', ')}.`);
                setTimeout(() => game.advancePhase(PHASES.DAY_ELECTION_VOTE), 1000);
            } else {
                game.addLog("JUDGE: No candidates for Sheriff. Election cancelled.");
                setTimeout(() => game.advancePhase(PHASES.DAY_DISCUSSION), 2000);
            }
        }
    }

    handleVote(game, voterId, candidateId) {
        // Validation: voter must be alive.
        if (game.phase !== PHASES.DAY_ELECTION_VOTE) return;
        
        // Logic: Only candidates can be voted for
        if (!this.candidates.includes(candidateId)) {
            // Optional: Log error or just ignore
            return; 
        }
        
        this.votes[voterId] = candidateId;

        const alive = Object.values(game.players).filter(p => p.status === 'alive');
        if (Object.keys(this.votes).length >= alive.length) {
            this.resolve(game);
        }
    }

    resolve(game) {
        const counts = {};
        Object.values(this.votes).forEach(cid => {
            counts[cid] = (counts[cid] || 0) + 1;
        });

        let max = 0;
        let winners = [];
        for (const [cid, c] of Object.entries(counts)) {
            if (c > max) { max = c; winners = [cid]; }
            else if (c === max) winners.push(cid);
        }

        if (winners.length === 1) {
            game.sheriffId = winners[0];
            game.addLog(`JUDGE: Election Results: ${game.players[winners[0]].name} is elected Sheriff!`);
        } else {
            game.addLog("JUDGE: Election TIE. Badge is lost.");
            game.sheriffId = null;
        }

        setTimeout(() => game.advancePhase(PHASES.DAY_DISCUSSION), 3000);
    }
}

module.exports = ElectionManager;
