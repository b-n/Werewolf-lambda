'use strict';
import * as AWS from 'aws-sdk';
import { v4 } from 'node-uuid';
import * as errorMessage from '../lib/errorMessages';

export const dynamo = new AWS.DynamoDB.DocumentClient({region: 'us-west-2'});

export default function({operation, gameId, phase}, event, callback) {
    
    if (!gameId || !phase) return callback('need to specify a gameid and phase to use this function');
    
    Promise.all([ getGame(gameId), getRoles() ]).then(data => {

        const [ game, roles ] = data;
    
        if (!game.Item) throw new Error(errorMessage.INVALID_GAMEID);
        if (!roles.Items) throw new Error(errorMessage.NO_ROLES);

        switch (operation) {
            case 'create':
                return create(message, phase, roles, game);
                break;
            default:
                throw new Error(errorMessage.UNRECOGNISED_OPERATION);
        }
    })
    .catch(error => callback(error))
    .then(game => {
        return dynamo.put({
            TableName: 'werewolf-game',
            Item: game
        })
        .then(result => game)
        .catch(error => throw new Error(GAME_SAVE_FAILED));
    })
    .then(result => callback(null, result))
    .catch(error => callback(error));
};

function getGame(gameId) {
    return dynamo.get({
        TableName : 'werewolf-game',
        Key: { id : gameId }
    }).promise();
 
}

function getRoles() {
    return dynamo.scan({
        TableName : 'werewolf-role'
    }).promise();
}

function create(actions, phase, roles, game) {
    return new Promise((resolve, reject) => {
        //TODO: this needs to support player actions going forward (not role actions)
         
        const roleMap = roles.reduce((collection, role) => {
            collection[role.id] = role;
            return collection;
        }, {});
        
        const playerMap = game.players.reduce((collection, player) => {
            collection[player.id] = player;
            return collection;
        }, {});


        const players = [ ...game.players ];
        const playerAdjustments = items.reduce((collection, item) => {
            //validation
            if (!item.role) return reject('all actions need to have a role specified');
            if (!item.player) return reject('all actions need to specify a player');
            if (!playerMap[item.player]) return reject('player with id: ' + item.player + ' does not exist in this game');
            if (!playerMap[item.player].alive) return reject('actions can only be performed on alive players');
            
            const { hasNightAction, actionSaves, actionKills} = roleMap[item.role];
            
            if (hasNightAction && actionKills) collection[item.player] = false;
            if (hasNightAction && actionSaves) collection[item.player] = true;
            
            return collection;
        }, {});
        
        console.log(playerAdjustments);
        
        const newPlayers = players.map(player => {
            console.log(playerAdjustments[player.id]);
            if (playerAdjustments[player.id]) {
                return {
                    ...player,
                    alive: playerAdjustments[player.id]
                }
            }
            return { ...player };
        });
        
        const existingPhase = game.phases[phase] ? { ...game.phases[phase] } : { action: [], accusations: [] };

        const existingActions = [ ...existingPhase.action ];

        const newActions = existingActions.concat(items);

        const newPhase = {
            ...existingPhase,
            action: newActions
        };
        
        const newGame = {
            ...game,
            players: newPlayers,
            phases: {
                ...phases,
                [phase]: newPhase
            }
        } 
        
        resolve(game);
    });
}
