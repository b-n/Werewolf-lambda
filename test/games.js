import { assert as chaiAssert } from 'chai';
import { stub, spy, assert } from 'sinon';
import 'sinon-as-promised';
import games, { db } from '../games/handler.js'

assert.expose(chaiAssert, { prefix: "" });

describe('games', function() {

/*    it('allow scan', function() {
        const callback = spy();

        const scanPromise = stub();
        scanPromise.resolves('test');

        const scan = stub(db, "scan", () => {
            return {
                promise: () => { return scanPromise }
            }
        });

        const event = {
            operation: 'scan'
        }

        games(event, {}, callback);

        scan.restore();
        assert.calledOnce(scanPromise);
        assert.calledOnce(callback);
    });*/

    it('fails create with no name', function(done) {
        const putPromise = stub();
        putPromise.resolves('test data valid result');

        const put = stub(db, "put", () => {
            return {
                promise: putPromise
            }
        });

        const callback = (error, success) => {
            put.restore();
            assert.calledOnce(put);
            assert.calledOnce(putPromise);
            //assert.notEqual(error, null);
            //assert.equal(success, null); 
            done(); 
        }

        const event = {
            operation: 'create',
            message: {
                name: 'testing',
                moderator: 'testing'                
            }            
        }

        games(event, {}, callback);

    });
});


