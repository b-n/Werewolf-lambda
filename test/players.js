import { assert } from 'chai';
import { stub, spy, assert as sinonAssert } from 'sinon';
import 'sinon-as-promised';
sinonAssert.expose(assert, { prefix: "" });

import players, { db } from '../players/handler.js'
import * as errorMessage from '../lib/errorMessages'


describe('players', function() {
    const dummyPlayer1 = { id: '123', name: 'Test', order: 1, role: 'testRole', alive: true };
    const dummyPlayer2 = { id: '234', name: 'Test2', order: 2, role: 'testRole2', alive: false };
    const dummyGame = {
        players: [ dummyPlayer1, dummyPlayer2 ]
    };

    //aws sdk dummy setup
    let dummyPromise, put, get;
    before(function() {
        dummyPromise = stub();
        dummyPromise.onCall(0).resolves({ Item: dummyGame });
        dummyPromise.onCall(1).resolves('test');

        put = stub(db, "put", () => ({ promise: dummyPromise }));
        get = stub(db, "get", () => ({ promise: dummyPromise }));
    });

    after(function() {
        put.restore();
        get.restore();
    });

    beforeEach(function() {
        put.reset();
        get.reset();
        dummyPromise.reset();
    })
    
    //requires a gameid
    it('requires a game id', function() {
        const callback = (error, success) => {        
            assert.equal(error, errorMessage.REQUIRES_GAMEID);
            assert.equal(success, null); 
        }

        const event = {
            operation: 'not a real operation'
        };

        players(event, {}, callback);
    });

    //unrecognized function
    it('needs a valid function call', function() {
        const callback = (error, success) => {
            assert.calledOnce(get);
            assert.calledOnce(dummyPromise);
            assert.equal(error, errorMessage.UNRECOGNISED_OPERATION);
            assert.equal(success, null); 
        }

        const event = {
            gameid: '123test',
            operation: 'not a real operation'
        };

        players(event, {}, callback);
    });

    //create
    it('create requires no id, name, and order', function(done) {
        const createUser = {
            id: 'dummyid'
        };
        
        const expectedResult = {
            player: { ...createUser },
            errors: [ errorMessage.NO_ID_ON_CREATE, errorMessage.REQUIRES_NAME, errorMessage.REQUIRES_ORDER ],
            valid: false
        };


        const callback = (error, success) => {
            assert.calledOnce(get);
            assert.calledOnce(dummyPromise);
            assert.deepEqual(error, [ expectedResult ] );
            assert.equal(success, null); 
            done(); 
        }

        const event = {
            operation: 'create',
            gameid: '123test',
            message: [ createUser ]
        }

        players(event, {}, callback);
    });
    
    it('creates a user', function(done) {
        const createUser = {
            name: 'New Testing User',
            role: 'testingRole',
            order: 3,
            alive: true
        };

        const callback = (error, success) => {
            assert.calledOnce(get);
            assert.calledTwice(dummyPromise);
            assert.equal(success.players.length, 3);
            const newPlayers = new Map(success.players.map(player => [ player.name, player ]));
            assert.equal(newPlayers.has('New Testing User'), true, 'newPlayers array has the key "New Testing User"');

            let newPlayerWithoutId = newPlayers.get('New Testing User');
            delete newPlayerWithoutId.id;
            
            assert.deepEqual(newPlayerWithoutId, createUser);
            assert.equal(error, null); 
            done(); 
        }
        const event = {
            operation: 'create',
            gameid: '123test',
            message: [ createUser ]
        }

        players(event, {}, callback);
    });
    
    //remove
    it('removes a player', function(done) {
        
        const expectedResult = {
            players: [ dummyPlayer2 ]
        };

        const callback = (error, success) => {
            assert.calledOnce(get);
            assert.calledOnce(put);
            assert.calledTwice(dummyPromise);
            assert.equal(success.players.length, 1);
            
            assert.deepEqual(success, expectedResult);
            assert.equal(error, null); 
            done(); 
        }
        const event = {
            operation: 'remove',
            gameid: '123test',
            message: [ dummyPlayer1.id ]
        }

        players(event, {}, callback);
    });

    //update
    it('update a player - all values', function(done) {

        const newUpdatedUser = {
            ...dummyPlayer1,
            name: 'Updated User 1',
            order: 3,
            role: 'New Role',
            alive: false
        }

        const expectedResult = {
            players: [ newUpdatedUser, dummyPlayer2 ]
        };

        const callback = (error, success) => {
            assert.calledOnce(get);
            assert.calledOnce(put);
            assert.calledTwice(dummyPromise);
            assert.deepEqual(success, expectedResult);
            assert.equal(error, null); 
            done(); 
        }
        const event = {
            operation: 'update',
            gameid: '123test',
            message: [ newUpdatedUser ]
        }

        players(event, {}, callback);
    });
    
    //update
    it('update a player - no values', function(done) {

        const newUpdatedUser = {
            id: dummyPlayer1.id
        }

        const expectedResult = {
            players: [ dummyPlayer1, dummyPlayer2 ]
        };

        const callback = (error, success) => {
            assert.calledOnce(get);
            assert.calledOnce(put);
            assert.calledTwice(dummyPromise);
            assert.deepEqual(success, expectedResult);
            assert.equal(error, null); 
            done(); 
        }
        const event = {
            operation: 'update',
            gameid: '123test',
            message: [ newUpdatedUser ]
        }

        players(event, {}, callback);
    });

});


