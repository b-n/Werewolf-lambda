'use strict';
import { v4 } from 'node-uuid';
import { DynamoDB } from 'aws-sdk';

export const db = new DynamoDB.DocumentClient({region: 'us-west-2'});

export default ({operation, message, id}, context, callback) => {
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
            callback(`Unrecognized operation "${operation}"`);
    }

    p.then(result => {
        callback(null, result);
    })
    .catch(error => {
        callback(error)
    });
}


function create(item) {
    return new Promise((resolve, reject) => {
        const { name, moderator, players, phases } = item;

        if (!name) {
            reject('you need to specify a name for this call');
            return;
        }
        if (!moderator) {
            reject('you need to specify a moderator for this call');
            return;
        }

        const newGame = {
            id: v4(),
            currentPhase: 0,
            name: name,
            moderator: moderator,
            players: players ? players : [],
            phases: phases ? phases : {},
        }

        return db.put({
            Item : newGame,
            TableName: 'werewolf-game'
        }).promise()
        .then(data => {
            return resolve(newGame);
        })
        .catch(error => reject(error));
    });
}

function read(id) {
    return db.get({
        Key : { id : id },
        TableName: 'werewolf-game'
    }).promise();
}

function scan() {
    return db.scan({
        TableName: 'werewolf-game'
    }).promise();
}
