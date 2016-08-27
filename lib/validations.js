import * as errorMessage from './errorMessages';
import { v4 } from 'node-uuid';

export function validatePlayer(item) {

    let errors = [];

    if (item.id) errors.push(errorMessage.NO_ID_ON_CREATE);
    if (!item.name) errors.push(errorMessage.REQUIRES_NAME);
    if (item.order === undefined) errors.push(errorMessage.REQUIRES_ORDER);

    const newPlayer = {
        ...item,
        id: v4(), 
        role: item.role ? item.role : 'unassigned',
        alive: item.alive !== undefined ? item.alive : true
    };

    const player = errors.length !== 0 ? item : newPlayer;

    return {
        player,
        errors,
        valid : (errors.length === 0)
    };
}

export default {
    validatePlayer
}
