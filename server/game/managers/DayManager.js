const { PHASES, ROLES } = require('../constants');

class DayManager {
    constructor() {
        this.votes = {};
    }

    resetVotes() {
        this.votes = {};
    }

    handleVote(game, voterId, targetId) {
        const player = game.players[voterId];
        if (!player || player.status !== 'alive') return;

        // Toggle vote
        if (this.votes[voterId] === targetId) {
            delete this.votes[voterId];
        } else {
            this.votes[voterId] = targetId;
        }

        const aliveCount = Object.values(game.players).filter(p => p.status === 'alive').length;
        if (Object.keys(this.votes).length === aliveCount) {
            game.addLog("JUDGE: All votes received. Tallying...");
            setTimeout(() => this.resolve(game), 1500);
        }
    }

    resolve(game) {
        const voteCounts = {};
        // Initialize counts to 0 for targets
        Object.values(this.votes).forEach(targetId => {
             voteCounts[targetId] = 0;
        });

        Object.entries(this.votes).forEach(([voterId, targetId]) => {
             let w = 1;
             if (voterId === game.sheriffId) w = 1.5;
             voteCounts[targetId] = (voteCounts[targetId] || 0) + w;
        });

        let maxVotes = 0;
        let candidates = [];
        for (const [id, count] of Object.entries(voteCounts)) {
            if (count > maxVotes) { maxVotes = count; candidates = [id]; }
            else if (count === maxVotes) candidates.push(id);
        }

        game.phase = PHASES.DAY_ELIMINATION;

        if (candidates.length === 1) {
            const victim = candidates[0];
            game.players[victim].status = 'dead';
            game.addLog(`JUDGE: The village has voted to execute ${game.players[victim].name}.`);
            
            game.executedPlayerId = victim;

            if (victim === game.sheriffId) {
                 game.addLog(`JUDGE: The Sheriff has been executed!`);
            }
        } else {
            game.addLog("JUDGE: Tie vote. No one gets executed today.");
            game.executedPlayerId = null; 
        }

        const winResult = game.checkWinCondition();
        if (winResult) {
            game.finishGame(winResult);
        } else {
             if (game.executedPlayerId) {
                 // Victim Logic
                 if (game.executedPlayerId === game.sheriffId) {
                     game.pendingNextPhase = PHASES.DAY_LEAVE_SPEECH;
                     game.advancePhase(PHASES.DAY_SHERIFF_HANDOVER);
                 } else {
                     game.advancePhase(PHASES.DAY_LEAVE_SPEECH);
                 }
             } else {
                 setTimeout(() => game.startNightOrEnd(), 2000);
             }
        }
    }

    handleSheriffHandover(game, playerId, targetId) {
        if (playerId !== game.sheriffId) return;

        if (targetId && game.players[targetId]?.status === 'alive') {
            game.sheriffId = targetId;
            game.addLog(`JUDGE: Sheriff Badge has been passed to ${game.players[targetId].name}.`);
        } else {
            game.sheriffId = null;
            game.addLog("JUDGE: The Sheriff Badge has been torn!");
        }

        // Resume
        const next = game.pendingNextPhase;
        game.pendingNextPhase = null;

        if (next) {
            game.advancePhase(next);
        } else {
            game.startNightOrEnd();
        }
    }
}

module.exports = DayManager;
