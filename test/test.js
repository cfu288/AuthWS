const assert = require('assert');
const should = require('chai').should();
const expect = require('chai').expect;
const supertest = require('supertest');
const url = 'https://35.190.149.215:80'; //'mongodb://localhost:27017/test_db';
const api = supertest(url);

//const collection = 'tests'; //use users instead

describe('Array', function() { //Test group array 
    describe('#indexOf()', function() { //test group #indexOf()
        it('should return -1 when the value is not present', function(){ //individual  test
            assert.equal(-1, [1,2,3].indexOf(4));
        });
    });
});

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

describe('Create User', function() {
    it('Should return 201 when user does not already exist', function(done){
        api.put('/users/usr1?pw=pass1')
        .set('Accept', 'application/json')
        .expect(201)
        .end(function(err,res){
            expect(res.body).to.have.property("status");
            expect(res.body.status).to.equal("CREATED");
            expect(res.body).to.have.property("auth_token");
            expect(res.body.authToken).to.not.equal(null);
            done();
        });
    });
    it('Should return 303 when user already exists', function(){ 
         api.put('/users/usr1?pw=pass1')
        .set('Accept', 'application/json')
        .expect(303)
        .end(function(err,res){
            expect(res.body).to.have.property("status");
            expect(res.body.status).to.equal("EXISTS");
            expect(res.body).to.have.property("info");
            expect(res.body.info).to.equal("user usr1 already exists");
            done();
        });    
    });
});
