import * as AWS from 'aws-sdk';

export const db = new AWS.DynamoDB.DocumentClient({region: 'us-west-2'});
