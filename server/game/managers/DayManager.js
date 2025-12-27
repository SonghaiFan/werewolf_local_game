const { PHASES, ROLES } = require('../constants');
const VOICE_MESSAGES = require('../voiceMessages');

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
            const text = VOICE_MESSAGES.NEXT_SPEAKER(nextP.avatar);
            game.onVoiceCue(text);
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
                  setTimeout(() => game.startNightOrEnd(), 100);
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
            setTimeout(() => game.advancePhase(PHASES.DAY_VOTE), 100);
        } else {
            const nextId = this.speakingOrder[this.currentSpeakerIndex];
            const nextP = game.players[nextId];
            game.addLog(`JUDGE: Next speaker is ${nextP.name}.`);
            // Specific voice cue
            const text = VOICE_MESSAGES.NEXT_SPEAKER(nextP.avatar);
            game.onVoiceCue(text);
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
        const voteDetails = [];

        // Initialize counts to 0 for targets
        Object.values(this.votes).forEach(targetId => {
             if (targetId !== 'abstain') voteCounts[targetId] = 0;
        });

        // Tally and build detail log
        Object.entries(this.votes).forEach(([voterId, targetId]) => {
             const voterName = game.players[voterId]?.avatar || game.players[voterId]?.name || 'Unknown';
             
             if (targetId === 'abstain') {
                 voteDetails.push(`${voterName}->弃票`);
             } else {
                 let w = 1;
                 voteCounts[targetId] = (voteCounts[targetId] || 0) + w;
                 const targetName = game.players[targetId]?.avatar || game.players[targetId]?.name || 'Unknown';
                 voteDetails.push(`${voterName}->${targetName}`);
             }
        });

        // Log the details
        if (voteDetails.length > 0) {
            game.addLog(`JUDGE: Votes: ${voteDetails.join(', ')}`);
        } else {
            game.addLog(`JUDGE: No votes cast.`);
        }

        let maxVotes = 0;
        let candidates = [];
        for (const [id, count] of Object.entries(voteCounts)) {
            if (count > maxVotes) { maxVotes = count; candidates = [id]; }
            else if (count === maxVotes) candidates.push(id);
        }

        game.phase = PHASES.DAY_ELIMINATION;
        
        // If it's a tie, reset votes immediately so UI doesn't look stuck during the 5s tie announcement
        const names = Object.values(voteCounts);
        const tieMode = names.length === 0 || candidates.length > 1;
        
        if (tieMode) {
             this.resetVotes(); 
        }

        // Broadcast immediately to show the "Tallying" result / logs
        if(game.onGameUpdate) game.onGameUpdate(game);

        if (candidates.length === 1) {
            const victim = candidates[0];
            game.players[victim].status = 'dead';
            game.addLog(`JUDGE: The village has voted to execute ${game.players[victim].name}.`);
            
            game.checkDeathTriggers(victim, 'vote'); // Check for Hunter
            
            game.executedPlayerId = victim;
            game.banishCount = (game.banishCount || 0) + 1;

            const winResult = game.checkWinCondition();
            if (winResult) {
                game.finishGame(winResult);
            } else {
                 const proceedAfterHunter = () => {
                     // Rule: Day Execution Last Words ONLY for the FIRST banished player
                     if (game.banishCount === 1) {
                         // Phase: DAY_LEAVE_SPEECH (Standard)
                         game.phase = PHASES.DAY_LEAVE_SPEECH;
                         game.logs.push(`--- PHASE: ${PHASES.DAY_LEAVE_SPEECH} ---`);
                         
                         const code = game.players[victim].avatar || '?';
                         const text = VOICE_MESSAGES.BANISH_LEAVE_SPEECH(code);
                         game.triggerVoice(PHASES.DAY_LEAVE_SPEECH, text);
                         
                         if(game.onGameUpdate) game.onGameUpdate(game);
                     } else {
                         // NO Last Words for subsequent bans (Round > 1 usually)
                         const name = game.players[victim].name;
                         game.addLog(`JUDGE: ${name} executed. No last words allowed.`);
                         
                         const code = game.players[victim].avatar || '?';
                         const text = VOICE_MESSAGES.BANISH_GENERIC(code);
                         game.triggerVoice('GENERIC', text);
                         
                         setTimeout(() => game.startNightOrEnd(), 3000);
                     }
                 };

                 if (game.hunterDeadId) {
                     game.phaseBeforeHunter = 'VOTE_EXECUTION'; // Special flag
                     game.hunterCallback = proceedAfterHunter; // Use a callback for complex day branches
                     setTimeout(() => {
                         game.advancePhase(PHASES.DAY_HUNTER_DECIDE);
                     }, 2000);
                 } else {
                     proceedAfterHunter();
                 }
            }

        } else {
            // TIE / DRAW
            const text = VOICE_MESSAGES.DAY_VOTE_TIE;
            game.addLog(`JUDGE: ${text}`);
            game.onVoiceCue(text);

            game.executedPlayerId = null; 
            
            // Broadcast the tie message
            if(game.onGameUpdate) game.onGameUpdate(game);

            setTimeout(() => {
                game.addLog("JUDGE: Re-opening voting...");
                game.advancePhase(PHASES.DAY_VOTE); // Go back to voting
            }, 5000); // 5s delay to allow voice to finish
        }
    }


}

module.exports = DayManager;
