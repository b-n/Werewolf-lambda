'use strict';
import * as AWS from 'aws-sdk';
import { v4 } from 'node-uuid';

const dynamo = new AWS.DynamoDB.DocumentClient({region: 'us-west-2'});

export default function({operation, gameId, phase}, event, callback) {
    
    if (!gameid || !phase) {
        callback('need to specify a gameid and phase to use this function');
        return;
    }
    
    const gamePromise = d.get({
        TableName : 'werewolf-game',
        Key: { id : event.gameId }
    });
    const rolePromise = d.scan({
        TableName : 'werewolf-role'
    });
    
    
    Promise.all([ gamePromise, rolePromise ]).then(data => {

        console.log(data);
        const [ game, roles ] = data;
    
        if (!game.Item) throw new Error(`could not find game with id: ${gameId}`);
        if (!roles.Items) throw new Error('could not get roles from the database');

        switch (operation) {
            case 'create':
                return create(message, phase, roles, game);
                break;
            default:
                throw new Error(`Unrecognized operation "${operation}"`);
        }
    })
    .catch(error => callback(error))
    .then(game => {
        return d.put({
            TableName: 'werewolf-game',
            Item: game
        })
        .then(result => game)
        .catch(error => throw new Error('Could not save the game'));
    })
    .then(result => callback(null, result))
    .catch(error => callback(error));
};

function create(actions, phase, roles, game) {
    return new Promise((resolve, reject) => {
        
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
            if (!item.role) reject('all actions need to have a role specified');
            if (!item.player) reject('all actions need to specify a player');
            if (!playerMap[item.player]) reject('player with id: ' + item.player + ' does not exist in this game');
            if (!playerMap[item.player].alive) reject('actions can only be performed on alive players');
            
            const role = roleMap[item.role];
            
            if (role.hasNightAction && role.actionKills) collection[item.player] = false;
            if (role.hasNightAction && role.actionSaves) collection[item.player] = true;
            
            return collection;
        }, {});
        
        console.log(playerAdjustments);
        
        const newPlayers = players.map(player => {
            console.log(playerAdjustments[player.id]);
            if (playerAdjustments[player.id] !== undefined) {
                player.alive = playerAdjustments[player.id];
            }
            return player;
        });
        
        game.players = newPlayers;
        
        if (!game.phases[phase]) game.phases[phase] = { actions : [], accusations : [] };
        game.phases[phase].actions = items;
        
        resolve(game);
    });
}
