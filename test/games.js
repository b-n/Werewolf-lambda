import { assert } from 'chai';
import { stub, spy, assert as sinonAssert } from 'sinon';
import 'sinon-as-promised';
sinonAssert.expose(assert, { prefix: "" });

import games, { db } from '../games/handler.js'
import * as errorMessage from '../lib/errorMessages'


describe('games', function() {

    //TODO: assert success results with real data

    //aws sdk dummy setup
    let dummyPromise, scan, put, get;
    before(function() {
        dummyPromise = stub();

        scan = stub(db, "scan", () => ({ promise: dummyPromise }));
        put = stub(db, "put", () => ({ promise: dummyPromise }));
        get = stub(db, "get", () => ({ promise: dummyPromise }));
    });

    after(function() {
        scan.restore();
        put.restore();
        get.restore();
    });

    beforeEach(function() {
        dummyPromise.resolves('test');
        dummyPromise.reset();
        scan.reset();
        put.reset();
        get.reset();
    });

    //unrecognized function
    it('needs a valid function call', function() {
        const event = {
            operation: 'not a real operation'
        };

        games(event, {}, (error, success) => {
            assert.equal(error, errorMessage.UNRECOGNISED_OPERATION);
            assert.equal(success, null); 
        });
    });

    //scan
    it('allow scan', function(done) {
        const event = {
            operation: 'scan'
        }

        games(event, {}, (error, success) => {
            assert.calledOnce(scan);
            assert.calledOnce(dummyPromise);
            assert.equal(error, null);
            assert.equal(success, 'test'); 
            done(); 
        });
    });

    //create
    it('create requires a name', function(done) {

        const event = {
            operation: 'create',
            message: { moderator: 'testing' }            
        }

        games(event, {}, (error, success) => {
            assert.equal(error, errorMessage.REQUIRES_NAME);
            assert.equal(success, null); 
            done(); 
        });
    });
    
    it('create requires a moderator', function(done) {

        const event = {
            operation: 'create',
            message: { name: 'testing' }            
        }

        games(event, {}, function(error, success) {
            assert.equal(error, errorMessage.REQUIRES_MODERATOR);
            assert.equal(success, null); 
            done(); 
        });
    });

    it('creates successfully - no players', function(done) {
        const event = {
            operation: 'create',
            message: { moderator: 'testing', name: 'testing2' }            
        }

        games(event, {}, (error, success) => {
            assert.calledOnce(put);
            assert.calledOnce(dummyPromise);
            assert.equal(error, null);
            assert.notEqual(success, null); 
            done(); 
        });

    });
    
    it('creates successfully - with players', function(done) {
        const event = {
            operation: 'create',
            message: { moderator: 'testing', name: 'testing2', players: [ { name: 'Joe' } ] }            
        }

        games(event, {}, (error, success) => {
            assert.calledOnce(put);
            assert.calledOnce(dummyPromise);
            assert.equal(error, null);
            assert.notEqual(success, null); 
            done(); 
        });
    });

    
    //read
    it('read requires an id', function(done) {
        const event = {
            operation: 'read'
        }

        games(event, {}, (error, success) => {
            assert.equal(error, errorMessage.REQUIRES_ID);
            assert.equal(success, null); 
            done(); 
        });
    });

    it('reads an existing game', function(done) {


        const event = {
            operation: 'read',
            id: 'testingId'
        }

        games(event, {}, (error, success) => {
            assert.calledOnce(get);
            assert.calledOnce(dummyPromise);
            assert.equal(error, null);
            assert.equal(success, 'test');
            done(); 
        });

    });

});


