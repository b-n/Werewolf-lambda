'use strict';
import { DynamoDB } from 'aws-sdk';
import * as errorMessage from '../lib/errorMessages';
import { validatePlayer } from '../lib/validations';

export const db = new DynamoDB.DocumentClient({region: 'us-west-2'});

export default ({operation, gameid, phase, message}, context, callback) => {

    if (!gameid) return callback(errorMessage.REQUIRES_GAMEID);
    if (phase === undefined) return callback(errorMessage.REQUIRES_PHASE);

    db.get({
            TableName : 'werewolf-game',
            Key: { id : gameid }
    }).promise()
    .then(data => {
        if (!Object.keys(data).length) throw new Error(errorMessage.INVALID_GAMEID);

        const game = data.Item;

        switch (operation) {
            case 'create':
                return create(message, phase, game);
            default:
                throw new Error(errorMessage.UNRECOGNISED_OPERATION);
        }
    })
    .then(data => {
        return db.put({
            TableName : 'werewolf-game',
            Item : data.game
        }).promise()
        .then(result => data)
        .catch(error => errorMessage.GAME_SAVE_FAILED);
    })
    .then(result => callback(null, result))
    .catch(error => callback(error));
};

function create(accusation, phase, game) {
    return new Promise((resolve, reject) => {
        const { accused, accusedBy, votes } = accusation
        
        if (!accused) return reject(errorMessage.REQUIRES_ACCUSED);
        if (!accusedBy || !Array.isArray(accusedBy)) return reject(errorMessage.REQUIRES_ACCUSEDBY);

        const playerMap = new Map(game.players.map(player => [ player.id, player ]));        
        
        const validPlayers = playerMap.has(accused) && playerMap.get(accused).alive &&
            accusedBy.every(player => playerMap.has(player) && playerMap.get(player).alive);

        if (!validPlayers) return reject(errorMessage.PLAYER_NOT_EXIST_OR_ALIVE);

        //not enough accused by, or no votes - cancelled
        if (accusedBy.length < 2) {

            const newAccusation = {
                ...accusation,
                status: 'Cancelled'
            }
            const newGame = addAccusationToGame(game, phase, accusation);
            
            return resolve({ message : errorMessage.ACCUSATION_NOT_ENOUGH_ACCUSERS, game : newGame });
        }

        //make sure accusers are alive
        if (!votes || votes.length === 0) return reject(errorMessage.REQUIRES_VOTES);

        const voteMap = new Map(votes.map(vote => [ vote.player, vote.die ]));

        const playerVotes = Array.from(playerMap.values())
            .filter(player => player.alive && player.id !== accused)
            .map(player => (!voteMap.has(player.id) ? null : voteMap.get(player.id)));

        if (playerVotes.some(playerVote => playerVote === null)) return reject(errorMessage.REQUIRES_VOTES);

        const dieVotes = playerVotes.filter(playerVote => playerVote);
        
        const voteSuccess = dieVotes.length > playerVotes.length / 2;

        const newAccusation = {
            accused,
            accusedBy,
            votes,
            status: voteSuccess ? 'Success' : 'Failed'
        };

        const gameWithAccusation = addAccusationToGame(game, phase, accusation);

        if (voteSuccess) {
            const newGame = {
                ...gameWithAccusation,
                players: changePlayerState(gameWithAccusation.players, accused, false)
            };

            return resolve({ message: errorMessage.ACCUSATION_VOTE_SUCCESS, game: newGame });
        }

        resolve({ message : errorMessage.ACCUSATION_VOTE_FAILED, game: gameWithAccusation });
    });
}

function changePlayerState(players, playerId, alive) {
    return players.map(player => {
        if (player.id === playerId) {
            return {
                ...player,
                alive
            }
        } 
        return {
            ...player
        }
    });
}


function addAccusationToGame(game, phase, accusation) {

    const existingAccusations = (game.phases[phase] && game.phases[phase].accusations) ? game.phases[phase].accusations : [];

    const newAccusations = existingAccusations.concat(accusation);

    const existingPhase = game.phases[phase] ? game.phases[phase] : {};

    const newPhase = {
        ...existingPhase,
        accusations: newAccusations
    };

    return {
        ...game,
        phases: {
            ...game.phases,
            [phase]: newPhase
        }
    }
}
