const assert = require('assert');
const should = require('chai').should();
const expect = require('chai').expect;
const supertest = require('supertest');
const url = 'https://35.190.149.215:80'; //'mongodb://localhost:27017/test_db';
const api = supertest(url);
const mongo = require('mongodb').MongoClient;

//const collection = 'tests'; //use users instead

describe('Array', function() { //Test group array 
    describe('#indexOf()', function() { //test group #indexOf()
        it('should return -1 when the value is not present', function(){ //individual  test
            assert.equal(-1, [1,2,3].indexOf(4));
        });
    });
});

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"; //Allow self signed certificates for testing over HTTPS

before(function(){
    mongo.connect('mongodb://localhost:27017/test_db', function(err, db) {
        db.collection('users').deleteMany({}, function(err,obj) {
            if (err) error(err);
            db.close();
        });
    });
});

describe('Create User', function() {
    it('Should return 201 when user does not already exist', function(done){
        api.put('/users/usr1?pw=pass1')
        .set('Accept', 'application/json')
        .expect(201)
        .send({'payload':'sample payload data'})
        .end(function(err,res){
            expect(res.body).to.have.property("status");
            expect(res.body.status).to.equal("CREATED");
            expect(res.body).to.have.property("auth_token");
            expect(res.body.authToken).to.not.equal(null);
            done();
        });
    });
    it('Should return 303 when user already exists', function(done){ 
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

let authToken = undefined;

describe('Authenticate User', function() {
    it('Should return 200 when password is correct', function(done){
        api.put('/users/usr1/auth')
        .set('Accept', 'application/json')
        .send({'pw':'pass1'})
        .expect(200)
        .end(function(err,res){
            expect(res.body).to.have.property("status");
            expect(res.body.status).to.equal("OK");
            expect(res.body).to.have.property("auth_token");
            expect(res.body.auth_token).to.not.equal(null);
            authToken = res.body.auth_token;
            done();
        });
    });
    it('Should return 403 when password is incorrect', function(done){
        api.put('/users/usr1/auth')
        .set('Accept', 'application/json')
        .send({'pw':'incorrectPass'})
        .expect(403)
        .end(function(err,res){
            expect(res.body).to.have.property("status");
            expect(res.body.status).to.equal("ERROR_UNAUTHORIZED");
            expect(res.body).to.have.property("info");
            expect(res.body.info).to.not.equal(null);
            done();
        });
    });
    it('Should return 403 when pw field in body is missing', function(done){
        api.put('/users/usr1/auth')
        .set('Accept', 'application/json')
        .expect(403)
        .end(function(err,res){
            expect(res.body).to.have.property("status");
            expect(res.body.status).to.equal("ERROR_UNAUTHORIZED");
            expect(res.body).to.have.property("info");
            expect(res.body.info).to.not.equal(null);
            done();
        });
    });
    it('Should return 404 when the ID is not found', function(done){
        api.put('/users/usr555/auth')
        .set('Accept', 'application/json')
        .expect(404)
        .end(function(err,res){
            expect(res.body).to.have.property("status");
            expect(res.body.status).to.equal("ERROR_NOT_FOUND");
            expect(res.body).to.have.property("info");
            expect(res.body.info).to.not.equal(null);
            done();
        });
    });
});


describe('Get User Data', function() {
    it('Should return stored user data when token is correct', function(done){
        api.get('/users/usr1')
        .set('Accept', 'application/json')
        .set('Authorization', 'Bearer ' + authToken) // need to save authtoken
        .expect(200)
        .end(function(err,res){
            expect(res.body).to.have.property("payload");
            expect(res.body.payload).to.equal("sample payload data");
            done();
        });
    });
    it('Should return 400 when header is missing', function(done){
        api.get('/users/usr1')
        .set('Accept', 'application/json')
        .expect(400)
        .end(function(err,res){
            done();
        });
    });
    it('Should return 401 when token is incorrect', function(done){
        api.get('/users/usr1')
        .set('Accept', 'application/json')
        .set('Authorization', 'Bearer 1j2j5h4k3') // need to save authtoken
        .expect(401)
        .end(function(err,res){
            expect(res.body).to.have.property("status");
            expect(res.body.status).to.equal("ERROR_UNAUTHORIZED");
            expect(res.body).to.have.property("info");
            expect(res.body.info).to.not.equal(null);
            done();
        });
    });

});

after(function(){
    mongo.connect('mongodb://localhost:27017/test_db', function(err, db) {
        db.collection('users').deleteMany({}, function(err,obj) {
            if (err) error(err);
            db.close();
        });
    });
});
