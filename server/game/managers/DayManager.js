const { PHASES, ROLES } = require('../constants');

class DayManager {
    constructor() {
        this.votes = {};
        this.speakingOrder = [];
        this.currentSpeakerIndex = 0;
    }

    resetVotes() {
        this.votes = {};
        this.speakingOrder = [];
        this.currentSpeakerIndex = 0;
    }

    startDiscussion(game) {
        const alivePlayers = Object.values(game.players).filter(p => p.status === 'alive');
        // Sort by ID to ensure consistent order
        alivePlayers.sort((a, b) => a.id.localeCompare(b.id)); // Assuming ID is string
        
        let order = alivePlayers.map(p => p.id);

        // Plain logic: ID sort
        this.speakingOrder = order;
        this.currentSpeakerIndex = 0;
        
        if (order.length > 0) {
            const nextId = order[0];
            const nextP = game.players[nextId];
            game.addLog(`JUDGE: Discussion starts. ${nextP.name}, you have the floor.`);
            
            // Trigger specific voice for first speaker
            // setTimeout to let the "Start Discussion" intro play first if needed, 
            // but usually they are sequential in client queue or we just send it.
            // Let's send it directly.
            game.onVoiceCue(`请${nextP.avatar}号玩家发言`);
        } else {
             // Should unlikely happen
             game.advancePhase(PHASES.DAY_VOTE);
        }
        
        // Broadcast speaking order update
        if(game.onGameUpdate) game.onGameUpdate(game);
    }

    handleEndSpeech(game, playerId) {
        // Special case for Last Words
        if (game.phase === PHASES.DAY_LEAVE_SPEECH) {
             if (playerId === game.executedPlayerId || playerId === game.hostId) {
                  game.addLog("JUDGE: Last words concluded.");
                  setTimeout(() => game.startNightOrEnd(), 1000);
             }
             return;
        }

        if (this.speakingOrder.length === 0) return; // Not in discussion or empty

        const currentSpeaker = this.speakingOrder[this.currentSpeakerIndex];
        
        // Validation: Only current speaker can end (or Admin override?)
        // Let's allow admin for flexibility, but primary is speaker.
        // Assuming caller checks 'isAdmin' or we check ID.
        if (playerId !== currentSpeaker && playerId !== game.hostId) return;

        this.currentSpeakerIndex++;
        
        if (this.currentSpeakerIndex >= this.speakingOrder.length) {
            game.addLog("JUDGE: All speeches concluded.");
            setTimeout(() => game.advancePhase(PHASES.DAY_VOTE), 1000);
        } else {
            const nextId = this.speakingOrder[this.currentSpeakerIndex];
            const nextP = game.players[nextId];
            game.addLog(`JUDGE: Next speaker is ${nextP.name}.`);
            // Specific voice cue
            game.onVoiceCue(`请${nextP.avatar}号玩家发言`);
        }
        
        // Trigger generic update for UI
        if(game.onGameUpdate) game.onGameUpdate(game);
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
                 game.advancePhase(PHASES.DAY_LEAVE_SPEECH);
             } else {
                 setTimeout(() => game.startNightOrEnd(), 2000);
             }
        }
    }


}

module.exports = DayManager;
