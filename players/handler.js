'use strict';
import { DynamoDB } from 'aws-sdk';
import * as errorMessage from '../lib/errorMessages';
import { validatePlayer } from '../lib/validations';

export const db = new DynamoDB.DocumentClient({region: 'us-west-2'});

export default ({operation, gameid, message}, context, callback) => {
    
    if (!gameid) return callback(errorMessage.REQUIRES_GAMEID);
    
    db.get({
        TableName : 'werewolf-game',
        Key: { id : gameid }
    }).promise()
    .then(data => {

        if (!Object.keys(data).length) throw new Error(errorMessage.INVALID_GAMEID);

        const game = data.Item;

        switch (operation) {
            case 'create':
                return create(message, game);
            case 'remove':
                return remove(message, game);
            case 'update':
                return update(message, game);
            default:
                throw new Error(errorMessage.UNRECOGNISED_OPERATION);
        }
    })
    .then(game => {
        return db.put({
            TableName : 'werewolf-game',
            Item : game
        }).promise()
        .then(result => game)
        .catch(error => errorMessage.GAME_SAVE_FAILED);
    })
    .then(result => callback(null, result))
    .catch(error => callback(error));
};

function create(items, game) {
    return new Promise((resolve, reject) => {
        const playerValidations = items.map(item => validatePlayer(item));

        const errors = playerValidations.filter(player => !player.valid);

        if (errors.length > 0) return reject(errors);

        const players = playerValidations.map(player => player.player);

        const gamePlayers = game.players.concat(players);

        const newGame = {
            ...game,
            players: gamePlayers
        }

        resolve(newGame);
    });
}

function remove(items, game) {
    return new Promise((resolve, reject) => {

        const itemSet = new Set(items);

        const players = game.players.filter(player => !itemSet.has(player.id));

        const newGame = {
            ...game,
            players
        }
        
        resolve(newGame);
    });
}

function update(items, game) {
    return new Promise((resolve, reject) => {

        const newValueMap = new Map(items.map(item => [ item.id, item ]));

        const players = game.players.map(player => {
            if (newValueMap.has(player.id)) {
                const { name, role, order, alive } = newValueMap.get(player.id);
                return {
                    ...player,
                    name: name ? name : player.name,
                    role: role ? role : player.role,
                    order: order ? order : player.order,
                    alive: alive !== undefined ? alive : player.alive
                }
            }
            return { ...player };
        });

        const newGame = {
            ...game,
            players
        }

        resolve(newGame);
    });
}
