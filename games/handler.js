'use strict';
import { v4 } from 'node-uuid';
import { DynamoDB } from 'aws-sdk';
import * as errorMessage from '../lib/errorMessages';

export const db = new DynamoDB.DocumentClient({region: 'us-west-2'});

export default ({operation, id, message}, context, callback) => {
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
            callback(errorMessage.UNRECOGNISED_OPERATION);
    }

    p
    .then(result => callback(null, result))
    .catch(error => callback(error));
}


function create(item) {
    return new Promise((resolve, reject) => {
        const { name, moderator, players, phases } = item;

        if (!name) {
            reject(errorMessage.REQUIRES_NAME);
            return;
        }
        if (!moderator) {
            reject(errorMessage.REQUIRES_MODERATOR);
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
        .then(data => resolve(newGame))
        .catch(error => reject(error));
    });
}

function read(id) {
    return new Promise((resolve, reject) => {
        if (!id) {
            reject(errorMessage.REQUIRES_ID);
            return;
        }
        return db.get({
            Key : { id : id },
            TableName: 'werewolf-game'
        }).promise()
        .then(data => resolve(data))
        .catch(error => reject(error));
    });
}

function scan() {
    return db.scan({
        TableName: 'werewolf-game'
    }).promise();
}
