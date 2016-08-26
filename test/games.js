import chai from 'chai';
import { stub, spy, assert } from 'sinon';
import 'sinon-as-promised';
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

    //scan
    it('allow scan', function(done) {
        
        const callback = (error, success) => {
            assert.calledOnce(scan);
            assert.calledOnce(dummyPromise);
            chai.assert.equal(error, null);
            chai.assert.equal(success, 'test'); 
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
            chai.assert.equal(error, errorMessage.REQUIRES_NAME);
            chai.assert.equal(success, null); 
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
            chai.assert.equal(error, errorMessage.REQUIRES_MODERATOR);
            chai.assert.equal(success, null); 
            done(); 
        }

        const event = {
            operation: 'create',
            message: { name: 'testing' }            
        }

        games(event, {}, callback);
    });

    it('creates successfully', function(done) {

        const callback = (error, success) => {
            assert.called(put);
            assert.called(dummyPromise);
            chai.assert.equal(error, null);
            chai.assert.notEqual(success, null); 
            done(); 
        }

        const event = {
            operation: 'create',
            message: { moderator: 'testing', name: 'testing2' }            
        }

        games(event, {}, callback);

    });

    
    //read
    it('read requires an id', function(done) {

        const callback = (error, success) => {
            chai.assert.equal(error, errorMessage.REQUIRES_ID);
            chai.assert.equal(success, null); 
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
            chai.assert.equal(error, null);
            chai.assert.equal(success, 'test');
            done(); 
        }

        const event = {
            operation: 'read',
            id: 'testingId'
        }

        games(event, {}, callback);

    });

});


