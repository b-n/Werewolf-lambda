'use strict';
import { v4 } from 'node-uuid';
import { DynamoDB } from 'aws-sdk';
import * as errorMessage from '../lib/errorMessages';

export const db = new DynamoDB.DocumentClient({region: 'us-west-2'});

export default ({operation, message}, context, callback) => {
    
    let p;
    switch (operation) {
        case 'scan':
            p = scan();
            break;
        case 'create':
            p = create(message);
            break;
        default:
            return callback(errorMessage.UNRECOGNISED_OPERATION);
    }    
    
    p
    .then(result => callback(null, result))
    .catch(error => callback(error));
};

function scan() {
    return db.scan({
        TableName: 'werewolf-role'
    }).promise();
}

function create(item) {
    return new Promise((resolve, reject) => {
        if (!item.order) return reject(errorMessage.REQUIRES_ORDER);
        
        const newItem = {
            ...item,
            id: v4()
        };
        
        return db.put({
            TableName: 'werewolf-role',
            Item: newItem
        }).promise()
        .then(data => resolve(newItem))
        .catch(error => reject(error));
    });
}
