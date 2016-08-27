import { assert } from 'chai';
import { stub, spy, assert as sinonAssert } from 'sinon';
import 'sinon-as-promised';
sinonAssert.expose(assert, { prefix: '' });

import roles, { db } from '../roles/handler.js'
import * as errorMessage from '../lib/errorMessages'

describe('roles', function() {

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

        roles(event, {}, callback);
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

        roles(event, {}, callback);
    });

    //create
    it('create requires an order', function(done) {
        const callback = (error, success) => {
            assert.equal(error, errorMessage.REQUIRES_ORDER);
            assert.equal(success, null);
            done(); 
        }

        const event = {
            operation: 'create',
            message: { name: 'testing' }            
        }

        roles(event, {}, callback);
    });
    
    it('creates successfully', function(done) {

        const callback = (error, success) => {
            assert.called(put);
            assert.called(dummyPromise);
            assert.equal(error, null);
            assert.notEqual(success, null); 
            done(); 
        }

        const event = {
            operation: 'create',
            message: { name: 'testing', order: 1 }            
        }

        roles(event, {}, callback);

    });
});


