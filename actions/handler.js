'use strict';
console.log('Loading function');
const AWS = require('aws-sdk');

const dynamo = new AWS.DynamoDB.DocumentClient({region: 'us-west-2'});

const d={batchGet:p=>{return new Promise((r,t)=>{dynamo.batchGet(p,function(e,d){e?t(e):r(d);})})},batchWrite:p=>{return new Promise((r,t)=>{dynamo.batchWrite(p,function(e,d){e?t(e):r(d);})})},createSet:p=>{return new Promise((r,t)=>{dynamo.createSet(p,function(e,d){e?t(e):r(d);})})},delete:p=>{return new Promise((r,t)=>{dynamo.delete(p,function(e,d){e?t(e):r(d);})})},get:p=>{return new Promise((r,t)=>{dynamo.get(p,function(e,d){e?t(e):r(d);})})},put:p=>{return new Promise((r,t)=>{dynamo.put(p,function(e,d){e?t(e):r(d);})})},query:p=>{return new Promise((r,t)=>{dynamo.query(p,function(e,d){e?t(e):r(d);})})},scan:p=>{return new Promise((r,t)=>{dynamo.scan(p,function(e,d){e?t(e):r(d);})})},update:p=>{return new Promise((r,t)=>{dynamo.update(p,function(e,d){e?t(e):r(d);})})}};
function guid(){function n(){return Math.floor(65536*(1+Math.random())).toString(16).substring(1)}return n()+n()+"-"+n()+"-"+n()+"-"+n()+"-"+n()+n()+n()}

module.exports.handler = function(event, context, callback) {
    console.log(event);
    const operation = event.operation;
    
    if (!event.gameid || !event.phase) {
        callback('need to specify a gameid and phase to use this function');
        return;
    }
    
    var queries = [
        d.get({
            TableName : 'werewolf-game',
            Key: { id : event.gameid }
        }),
        d.scan({
            TableName : 'werewolf-role'
        })
    ];
    
    Promise.all(queries).then(data => {
        if (!Object.keys(data[0]).length) throw new Error('could not find game with id : ' + event.gameid);
        if (!Object.keys(data[1]).length) throw new Error('could not get roles from the database');

        let game = data[0].Item;
        let roles = data[1].Items;
        
        if          (operation == 'create') return create(event.message, event.phase, roles, game);
        else throw new Error(`Unrecognized operation "${operation}"`);
    }).catch(error => {
        callback(error);
    }).then(game => {
        return d.put({
            TableName : 'werewolf-game',
            Item : game
        }).then(result => {
            return game;    
        }).catch(error => {
            throw new Error('Could not save the game');
        });
    }).then(result => {
        callback(null, result);
    }).catch(error => {
        callback(error);
    });
};

function create(items, phase, roles, game) {
    return new Promise((resolve, reject) => {
        const roleMap = roles.reduce((collection, role) => {
            collection[role.id] = role;
            return collection;
        }, {});
        
        const players = game.players.slice();
        
        const playerMap = game.players.reduce((collection, player) => {
            collection[player.id] = player;
            return collection;
        }, {});
        
        
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
