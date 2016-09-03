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
        scan.reset();
        put.reset();
        get.reset();
        dummyPromise.reset();
    })

    //unrecognized function
    it('needs a valid function call', function() {
        const event = {
            operation: 'not a real operation'
        };

        roles(event, {}, (error, success) => {
            assert.equal(error, errorMessage.UNRECOGNISED_OPERATION);
            assert.equal(success, null); 
        });
    });

    //scan
    it('allow scan', function(done) {
        const event = {
            operation: 'scan'
        }

        roles(event, {}, (error, success) => {
            assert.calledOnce(scan);
            assert.calledOnce(dummyPromise);
            assert.equal(error, null);
            assert.equal(success, 'test'); 
            done(); 
        });
    });

    //create
    it('create requires an order', function(done) {
        const event = {
            operation: 'create',
            message: { name: 'testing' }            
        }

        roles(event, {}, (error, success) => {
            assert.equal(error, errorMessage.REQUIRES_ORDER);
            assert.equal(success, null);
            done(); 
        });
    });
    
    it('creates successfully', function(done) {
        const event = {
            operation: 'create',
            message: { name: 'testing', order: 1 }            
        }

        roles(event, {}, (error, success) => {
            assert.calledOnce(put);
            assert.calledOnce(dummyPromise);
            assert.equal(error, null);
            assert.notEqual(success, null); 
            done(); 
        });
    });
});


