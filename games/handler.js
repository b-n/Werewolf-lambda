'use strict';
import * as AWS from 'aws-sdk';
import { v4 } from 'node-uuid';

const dynamo = new AWS.DynamoDB.DocumentClient({region: 'us-west-2'});

export default ({operation, message, id}, context, callback) => {
    console.log(operation);
    let p;

    switch (operation) {
        case 'scan':
            p = scan();
            break;
        case 'create':
            p = create(message);
            break;
        case 'read':
            p = read(id);
            break;
        default:
            throw new Error(`Unrecognized operation "${operation}"`);
    }
    
    return Promise.resolve(p)
        .then(result => callback(null, result))
        .catch(error => callback(error));
}


function create(item) {
    const { name, moderator, players, phases } = item;

    if (!name) throw new Error('you need to specify a name for this call');
    if (!moderator) throw new Error('you need to specify a moderator for this call');

    const newGame = {
        id: v4(),
        currentPhase: 0,
        name: name,
        moderator: moderator,
        players: players ? players : [],
        phases: phases ? phases : {},
    }

    return dynamo.put({
        Item : newGame,
        TableName: 'werewolf-game'
    }).promise()
    .then(data => {
        return newGame;
    });
}

function read(id) {
    return dynamo.get({
        Key : { id : id },
        TableName: 'werewolf-game'
    }).promise();
}

function scan() {
    return dynamo.scan({
        TableName: 'werewolf-game'
    }).promise();
}
