const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const https = require('https');
const fs = require('fs');
// TODO : Use espress-bearer-token module in the future to handle tokens

const OK = 200;
const CREATED = 201;
const SEE_OTHER = 303;
const BAD_REQUEST = 400;
const UNAUTHORIZED = 401;
const NOT_FOUND = 404;
const SERVER_ERROR = 500;


function serve(port, authTimeout, sslDir, model) {
    const app = express();
    app.locals.model = model;
    app.locals.authTimeout = authTimeout;
    if (sslDir !== undefined){
        app.locals.sslDir = sslDir;
    }else{
        app.locals.sslDir = '';
    }
    app.locals.port = port;
    setupRoutes(app);
      
    var KEY_PATH = 'key.pem'
    var CERT_PATH = 'cert.pem'
    
    https.createServer({
        key: fs.readFileSync(app.locals.sslDir + '/' + KEY_PATH),
        cert: fs.readFileSync(app.locals.sslDir + '/' +CERT_PATH)
    }, app).listen(port, function() {
        console.log(`listening on port ${port}`);
    });
}


function setupRoutes(app) {
    app.use(bodyParser.json());
    app.put('/users/:id/auth', putUserAuth(app));
    app.put('/users/:id', createUser(app));
    app.get('/users/:id', getUserFun(app));
}

function putUserAuth(app){
    return function(request, response) {
        const id = request.params.id;
        const pw = request.body.pw;
        console.log("id: "+id);
        console.log("pw: "+pw);
        if (typeof id === undefined || typeof pw === undefined) {
            response.sendStatus(BAD_REQUEST);
        }else{
            //See if user exists in db
            request.app.locals.model.users.getUser(id).
            then((usr) =>{
                //if does, check pw and send auth/json
                //check if usr psd is correct
                bcrypt.compare(pw, usr.hash).then((res) => {
                    //pw is correct
                    if(res === true){
                        //generate and store updated token
                        console.log('CORRECT PW!');
                        var token = Math.floor(Math.random()*4096*4096);
                        usr.token = token;
                        usr.timeout = new Date().getTime()/1000;
                        request.app.locals.model.users.updateUser(usr).then(()=>{
                          // console.log("updated user"); 
                        }).catch(()=>{
                            //failed to update user 
                            var retVal = {};
                            retVal.status = "ERROR_NOT_FOUND";
                            retVal.info = "user " + id + " not found";
                            response.status(NOT_FOUND).json(retVal);
                        });
                        //response json
                        let retVal ={};
                        retVal.status = "OK";
                        retVal.auth_token = token;
                        retVal.expires_in = app.locals.authTimeout; 
                        response.status(200).json(retVal);
                    }else{
                        //pw is incorrect
                        console.log('INCORRECT PW!');
                        let retVal ={};
                        retVal.status = "ERROR_UNAUTHORIZED";
                        retVal.info = "/users/" + id + "/auth requires a valid 'pw' password query paramater";
                        response.status(UNAUTHORIZED).json(retVal);
                    }
                }).catch((err) =>{
                    //Issue with pw
                    let retVal ={};
                    retVal.status = "ERROR_UNAUTHORIZED";
                    retVal.info = "/users/" + id + "/auth requires a valid 'pw' password query paramater";
                    response.status(UNAUTHORIZED).json(retVal);
                    console.error(err);
                });
            }).catch((err)=>{
                //if does not, send err  
                var retVal = {};
                retVal.status = "ERROR_NOT_FOUND";
                retVal.info = "user " + id + " not found";
                response.status(NOT_FOUND).json(retVal);
                console.error(err);
            });
        }
    }
}

function createUser(app){
    return function(request, response) {
        const id = request.params.id;
        const pw = request.query.pw;
        if (typeof id === undefined || typeof pw === undefined) {
          response.sendStatus(BAD_REQUEST);
        }
        else {
            request.app.locals.model.users.getUser(id).
            then(() => {
                //USER ALREADY EXISTS
                var retVal = {};
                retVal.status = "EXISTS";
                retVal.info = "user " + id + " already exists";
                response.location(request.hostname + '/users/' + id );
                response.status(SEE_OTHER).json(retVal);
            }).catch(() => {
                //NEED TO CREATE USER
                var bod = {};
                var token = Math.floor(Math.random()*4096*4096);
                //async password hash
                bcrypt.hash(pw,10).then((hash) => {
                    //create usr obj
                    bod._id = id;
                    bod.hash = hash;
                    bod.token = token;
                    bod.timeout = new Date().getTime()/1000;
                    if (request.body != undefined ) {
                        bod.body = request.body;
                    }
                    //After password hash and user create, store bod
                    request.app.locals.model.users.newUser(bod).
                    then((id) => {
                        //send response to client
                        let retVal ={};
                        retVal.status = "CREATED";
                        retVal.auth_token = token
                        retVal.expires_in = app.locals.authTimeout; 
                        response.location(request.hostname + '/users/' + id );
                        response.status(CREATED).json(retVal);
                    }).catch((err) => {
                        //Failed to create new user in db
                        console.err(err);
                        response.sendStatus(SERVER_ERROR);
                    });

                }).catch((err) => {
                    //failed to hash password
                    console.err(err);
                    response.sendStatus(SERVER_ERROR);
                });
            });
        }
    };
}

function getUserFun(app) {
    return function(request, response) {
        const id = request.params.id;
        let auth = request.get("authorization")
        auth = auth.split(" ")[1];
        if (typeof id === 'undefined') {
          response.sendStatus(BAD_REQUEST);
        }
        else {
            request.app.locals.model.users.getUser(id).
            then((user) => {
                //found user
                var currTime = new Date().getTime()/1000;
                var timedOut = Math.abs(user.timeout - currTime); 
                if(user.token !== undefined && user.token == auth && timedOut < app.locals.authTimeout){
                    //console.log("same!");
                    response.send(user.body);
                }
                else{
                    //console.log("different!");
                    let retVal = {};
                    retVal.status = "ERROR_UNAUTHORIZED";
                    retVal.info ="/users/" + id + " requires a bearer authorization header";
                    response.status(UNAUTHORIZED).json(retVal);
                        
                }
            }).
            catch((err) => {
                //user not found
                console.error(err);
                let retVal = {};
                retVal.status = "ERROR_NOT_FOUND";
                retVal.info ="user " + id + " not found";
                response.status(NOT_FOUND).json(retVal);
            });
        }
    };
}

function requestUrl(req) {
  const port = req.app.locals.port;
  return `${req.protocol}://${req.hostname}:${port}${req.originalUrl}`;
}
  
module.exports = {
  serve: serve
}
