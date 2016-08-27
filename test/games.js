import { assert } from 'chai';
import { stub, spy, assert as sinonAssert } from 'sinon';
import 'sinon-as-promised';
sinonAssert.expose(assert, { prefix: "" });

import games, { db } from '../games/handler.js'
import * as errorMessage from '../lib/errorMessages'


describe('games', function() {

    //aws sdk dummy setup
    let dummyPromise, scan, put, get;
    before(function() {
        dummyPromise = stub();
        dummyPromise.resolves('test');

        scan = stub(db, "scan", () => ({ promise: dummyPromise }));
        put = stub(db, "put", () => ({ promise: dummyPromise }));
        get = stub(db, "get", () => ({ promise: dummyPromise }));
    });

    after(function() {
        scan.restore();
        put.restore();
        get.restore();
    })

    //unrecognized function
    it('needs a valid function call', function() {
        const callback = (error, success) => {
            assert.equal(error, errorMessage.UNRECOGNISED_OPERATION);
            assert.equal(success, null); 
        }

        const event = {
            operation: 'not a real operation'
        };

        games(event, {}, callback);
    });

    //scan
    it('allow scan', function(done) {
        
        const callback = (error, success) => {
            assert.calledOnce(scan);
            assert.calledOnce(dummyPromise);
            assert.equal(error, null);
            assert.equal(success, 'test'); 
            done(); 
        }

        const event = {
            operation: 'scan'
        }

        games(event, {}, callback);
    });

    //create
    it('create requires a name', function(done) {
        const callback = (error, success) => {
            assert.equal(error, errorMessage.REQUIRES_NAME);
            assert.equal(success, null); 
            done(); 
        }

        const event = {
            operation: 'create',
            message: { moderator: 'testing' }            
        }

        games(event, {}, callback);
    });
    
    it('create requires a moderator', function(done) {
        const callback = (error, success) => {
            assert.equal(error, errorMessage.REQUIRES_MODERATOR);
            assert.equal(success, null); 
            done(); 
        }

        const event = {
            operation: 'create',
            message: { name: 'testing' }            
        }

        games(event, {}, callback);
    });

    it('creates successfully - no players', function(done) {
        const callback = (error, success) => {
            assert.called(put);
            assert.called(dummyPromise);
            assert.equal(error, null);
            assert.notEqual(success, null); 
            done(); 
        }

        const event = {
            operation: 'create',
            message: { moderator: 'testing', name: 'testing2' }            
        }

        games(event, {}, callback);

    });
    
    it('creates successfully - with players', function(done) {
        const callback = (error, success) => {
            assert.called(put);
            assert.called(dummyPromise);
            assert.equal(error, null);
            assert.notEqual(success, null); 
            done(); 
        }

        const event = {
            operation: 'create',
            message: { moderator: 'testing', name: 'testing2', players: [ { name: 'Joe' } ] }            
        }

        games(event, {}, callback);
    });

    
    //read
    it('read requires an id', function(done) {

        const callback = (error, success) => {
            assert.equal(error, errorMessage.REQUIRES_ID);
            assert.equal(success, null); 
            done(); 
        }

        const event = {
            operation: 'read'
        }

        games(event, {}, callback);

    });

    it('reads an existing game', function(done) {

        const callback = (error, success) => {
            assert.called(get);
            assert.called(dummyPromise);
            assert.equal(error, null);
            assert.equal(success, 'test');
            done(); 
        }

        const event = {
            operation: 'read',
            id: 'testingId'
        }

        games(event, {}, callback);

    });

});


