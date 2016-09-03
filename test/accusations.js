import { assert } from 'chai';
import { stub, spy, assert as sinonAssert } from 'sinon';
import 'sinon-as-promised';
sinonAssert.expose(assert, { prefix: "" });

import accusations, { db } from '../accusations/handler.js'
import * as errorMessage from '../lib/errorMessages'

describe('accusations', function() {
    const dummyPlayer1 = { id: '1', name: 'Test1', order: 1, role: 'testRole', alive: true };
    const dummyPlayer2 = { id: '2', name: 'Test2', order: 2, role: 'testRole', alive: true };
    const dummyPlayer3 = { id: '3', name: 'Test3', order: 3, role: 'testRole', alive: true };
    const dummyPlayer4 = { id: '4', name: 'Test4', order: 4, role: 'testRole', alive: true };
    const dummyPlayer5 = { id: '5', name: 'Test5', order: 5, role: 'testRole', alive: false };
    let dummyGame = {
        players: [ dummyPlayer1, dummyPlayer2, dummyPlayer3, dummyPlayer4, dummyPlayer5 ],
        phases: {}
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

        accusations(event, {}, callback);
    });

    it('needs a phase', function() {
        const callback = (error, success) => {
            assert.equal(error, errorMessage.REQUIRES_PHASE);
            assert.equal(success, null); 
        }

        const event = {
            gameid: '123test',
            operation: 'not a real operation'
        };

        accusations(event, {}, callback);
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
            phase: 0,
            operation: 'not a real operation'
        };

        accusations(event, {}, callback);
    });


    //create
    it('create fails no accused', function(done) {
        const accusation = {
            accusedBy: [ dummyPlayer2.id, dummyPlayer3.id ]
        };

        const callback = (error, success) => {
            assert.calledOnce(get);
            assert.calledOnce(dummyPromise);
            assert.equal(success, null);
            assert.equal(error, errorMessage.REQUIRES_ACCUSED);
            done();
        }

        const event = {
            gameid: '123test',
            phase: 0,
            operation: 'create',
            message: accusation
        };

        accusations(event, {}, callback);
    });

    it('create fails no accusedby', function(done) {
        const accusation = {
            accused: dummyPlayer1.id
        };

        const callback = (error, success) => {
            assert.calledOnce(get);
            assert.calledOnce(dummyPromise);
            assert.equal(success, null);
            assert.equal(error, errorMessage.REQUIRES_ACCUSEDBY);
            done();
        }

        const event = {
            gameid: '123test',
            phase: 0,
            operation: 'create',
            message: accusation
        };

        accusations(event, {}, callback);
    });

    it('create fails invalid user', function(done) {
        const accusation = {
            accused: dummyPlayer1.id,
            accusedBy: [ dummyPlayer2.id, dummyPlayer5.id ] //player 5 is not alive
        };

        const callback = (error, success) => {
            assert.calledOnce(get);
            assert.calledOnce(dummyPromise);
            assert.equal(success, null);
            assert.equal(error, errorMessage.PLAYER_NOT_EXIST_OR_ALIVE);
            done();
        }

        const event = {
            gameid: '123test',
            phase: 0,
            operation: 'create',
            message: accusation
        };

        accusations(event, {}, callback);
    });

    it('create fails requires vote object', function(done) {
        const accusation = {
            accused: dummyPlayer1.id,
            accusedBy: [ dummyPlayer2.id, dummyPlayer3.id ] 
        };

        const callback = (error, success) => {
            assert.calledOnce(get);
            assert.calledOnce(dummyPromise);
            assert.equal(success, null);
            assert.equal(error, errorMessage.REQUIRES_VOTES);
            done();
        }

        const event = {
            gameid: '123test',
            phase: 0,
            operation: 'create',
            message: accusation
        };

        accusations(event, {}, callback);
    });

    it('create fails requires valid votes', function(done) {
        const accusation = {
            accused: dummyPlayer1.id,
            accusedBy: [ dummyPlayer2.id, dummyPlayer3.id ],
            votes: [ { player: dummyPlayer5.id, die: true } ] //should have all alive players 
        };

        const callback = (error, success) => {
            assert.calledOnce(get);
            assert.calledOnce(dummyPromise);
            assert.equal(success, null);
            assert.equal(error, errorMessage.REQUIRES_VOTES);
            done();
        }

        const event = {
            gameid: '123test',
            phase: 0,
            operation: 'create',
            message: accusation
        };

        accusations(event, {}, callback);
    });

    it('creates a not enough accused accusation', function(done) {
        const accusation = {
            accused: dummyPlayer1.id,
            accusedBy: [ dummyPlayer2.id ]
        };

        const expectedResult = {
            message: errorMessage.ACCUSATION_NOT_ENOUGH_ACCUSERS,
            game: {
                ...dummyGame,
                phases: {
                    '0': {
                        accusations: [ accusation ]
                    }
                } 
            }
        };

        const callback = (error, success) => {
            assert.calledOnce(get);
            assert.calledOnce(put);
            assert.calledTwice(dummyPromise);
            assert.deepEqual(success, expectedResult );
            assert.equal(error, null); 
            done(); 
        }

        const event = {
            operation: 'create',
            gameid: '123test',
            phase: 0,
            message: accusation
        }

        accusations(event, {}, callback);
    });

    it('creates a success vote', function(done) {
        const accusation = {
            accused: dummyPlayer1.id,
            accusedBy: [ dummyPlayer2.id, dummyPlayer3.id ],
            votes: [
                { player: dummyPlayer2.id, die: true },
                { player: dummyPlayer3.id, die: true },
                { player: dummyPlayer4.id, die: false }
            ]
        };

        const dummyPlayer1Dead = { ...dummyPlayer1, alive: false };

        const expectedResult = {
            message: errorMessage.ACCUSATION_VOTE_SUCCESS,
            game: {
                ...dummyGame,
                players: [ dummyPlayer1Dead, dummyPlayer2, dummyPlayer3, dummyPlayer4, dummyPlayer5 ], 
                phases: {
                    '0': {
                        accusations: [ accusation ]
                    }
                } 
            }
        };

        const callback = (error, success) => {
            assert.calledOnce(get);
            assert.calledOnce(put);
            assert.calledTwice(dummyPromise);
            assert.deepEqual(success, expectedResult );
            assert.equal(error, null); 
            done(); 
        }

        const event = {
            operation: 'create',
            gameid: '123test',
            phase: 0,
            message: accusation
        }

        accusations(event, {}, callback);
    });
    
    it('creates a failed vote', function(done) {

        const accusation = {
            accused: dummyPlayer1.id,
            accusedBy: [ dummyPlayer2.id, dummyPlayer3.id ],
            votes: [
                { player: dummyPlayer2.id, die: false },
                { player: dummyPlayer3.id, die: false },
                { player: dummyPlayer4.id, die: true }
            ]
        };

        dummyGame = {
            ...dummyGame,
            phases: {
                '0': {
                    accusations: [ { existing: 'accusation' } ]
                }
            }
        }

        const expectedResult = {
            message: errorMessage.ACCUSATION_VOTE_FAILED,
            game: {
                ...dummyGame,
                phases: {
                    '0': {
                        accusations: [ accusation ]
                    }
                } 
            }
        };

        const callback = (error, success) => {
            assert.calledOnce(get);
            assert.calledOnce(put);
            assert.calledTwice(dummyPromise);
            assert.deepEqual(success, expectedResult );
            assert.equal(error, null); 
            done(); 
        }

        const event = {
            operation: 'create',
            gameid: '123test',
            phase: 0,
            message: accusation
        }

        accusations(event, {}, callback);
    });

});
