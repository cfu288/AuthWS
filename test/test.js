const assert = require('assert');
const axios = require('axios');

const url = '35.190.149.215:80'; //'mongodb://localhost:27017/test_db';
//const collection = 'tests'; //use users instead

describe('Array', function() { //Test group array 
    describe('#indexOf()', function() { //test group #indexOf()
        it('should return -1 when the value is not present', function(){ //individual  test
            assert.equal(-1, [1,2,3].indexOf(4));
        });
    });
});

describe('Create User', function() {
    /*describe('User Already Exists', function() {
        it('Should return 303 when user already exists', function(){ 
            
        });
    });*/
    describe('User Does Not Exist Yet', function(){
        it('Should return 201 when user does not already exist',
        function(){
            //console.log(`${url}/users/usr1?pw=$pass1`); 
            return axios.put(`${url}/users/usr1?pw=$pass1`, {"payload":'testpayload'})
            .then((response) => { //response.data, response.headers
                console.error(response);
                assert.strictEqual(201, response.status);
                done();
            })
            .catch((err) => {
                if (err) { assert.strictEqual(201, err.status); }
                console.error(err);
                done();
            });
        });
    });
});
