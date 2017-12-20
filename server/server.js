const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const https = require('https');
const fs = require('fs');
// TODO : Use express-bearer-token module in the future to handle tokens

const OK = 200;
const CREATED = 201;
const SEE_OTHER = 303;
const BAD_REQUEST = 400;
const UNAUTHORIZED = 401;
const NOT_FOUND = 404;
const SERVER_ERROR = 500;

//_____________________________RUN SERVER_____________________________

function serve(port, authTimeout, sslDir, model) {
    const app = express();
    app.locals.model = model;
    app.locals.authTimeout = authTimeout;
    app.locals.sslDir = sslDir || '';
    app.locals.port = port;
    setupRoutes(app);
    let KEY_PATH = 'key.pem'
    let CERT_PATH = 'cert.pem'
    https.createServer({
        key: fs.readFileSync(app.locals.sslDir + '/' + KEY_PATH),
        cert: fs.readFileSync(app.locals.sslDir + '/' + CERT_PATH)
    }, app).listen(port, function() {
        console.log(`listening on port ${port}`);
    });
}

//_____________________________METHODS_____________________________

function putUserAuth(app){
    return function(request, response) {
        const id = request.params.id;
        const pw = request.body.pw;
        if (typeof id === undefined || typeof pw === undefined) {
            sendStatus(app, request, response, "BAD_REQUEST");
        }else{ //See if user exists in db
            request.app.locals.model.users.getUser(id).
            then((usr) =>{ //User exists, check pw
                bcrypt.compare(pw, usr.hash).then((res) => { //Check if usr pswd is correct
                    if(res === true){ //Pw is correct, generate and store updated token
                        //console.log('CORRECT PW!');
                        let token = generateToken();
                        usr.token = token;
                        usr.timeout = new Date().getTime()/1000;
                        request.app.locals.model.users.updateUser(usr).then(()=>{ //User updated, send OK
                            sendStatus(app, request, response, "OK", id, token);
                        }).catch(()=>{ //Failed to find and update user 
                            sendStatus(app, request, response, "NOT_FOUND", id);
                        });
                    }else{ //Pw is incorrect
                        console.log('INCORRECT PW!');
                        sendStatus(app, request, response, "UNAUTHORIZED", id);
                    }
                }).catch((err) =>{ //Issue with pw
                    sendStatus(app, request, response, "UNAUTHORIZED", id);
                    console.error(err);
                });
            }).catch((err)=>{ //If does not find user, send err  
                sendStatus(app, request, response, "NOT_FOUND", id);
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
            sendStatus(app, request, response, "BAD_REQUEST");
        }else{
            request.app.locals.model.users.getUser(id). //Check if user already exists
            then(() => { //USER ALREADY EXISTS
                sendStatus(app, request, response, "SEE_OTHER", id);
            }).catch(() => { //NEED TO CREATE USER
                bcrypt.hash(pw,10) //Async hash password
                .then((hash) => {
                    let token = generateToken();
                    let bod = createUserObject(id, hash, request.body, token);
                    request.app.locals.model.users.newUser(bod). //Store usr obj in db
                    then((id) => { //Send response to client
                        sendStatus(app, request, response, "CREATED", id, token);
                    }).catch((err) => { //Failed to create new user in db
                        sendStatus(app, request, response, "SERVER_ERROR");
                        console.error(err);
                    });
                }).catch((err) => { //Failed to hash password
                    sendStatus(app, request, response, "SERVER_ERROR");
                    console.error(err);
                });
            });
        }
    };
}

function getUserFun(app) {
    return function(request, response) {
        const id = request.params.id;
        let auth = request.get("authorization")
        if (typeof id === 'undefined' || typeof auth === 'undefined') {
          sendStatus(app, request, response, "BAD_REQUEST")
        }
        else {
            auth = auth.split(" ")[1];
            request.app.locals.model.users.getUser(id).
            then((user) => { //Found user
                let currTime = new Date().getTime()/1000;
                let timedOut = Math.abs(user.timeout - currTime); 
                if(user.token !== undefined && user.token == auth && timedOut < app.locals.authTimeout){
                    response.send(user.body);
                }
                else{
                    sendStatus(app, request, response, "UNAUTHORIZED", id)
                }
            }).
            catch((err) => { //User not found
                sendStatus(app, request, response, "NOT_FOUND", id)
                console.error(err);
            });
        }
    };
}

//_____________________________HELPER FUNCTIONS_____________________________

function setupRoutes(app) {
    app.use(bodyParser.json());
    app.put('/users/:id/auth', putUserAuth(app));
    app.put('/users/:id', createUser(app));
    app.get('/users/:id', getUserFun(app));
}

function generateToken(){
    //Trivial right now, need to make more secure
    return Math.floor(Math.random()*4096*4096*4096);
}

function createUserObject(id, hash, reqBody, token = undefined) {
    let bod = {};
    bod._id = id;
    bod.hash = hash;
    if (token !== undefined){
        bod.token = token;
    }
    bod.timeout = new Date().getTime()/1000;
    if (reqBody != undefined ) {
        bod.body = reqBody;
    }
    return bod;
}

function sendStatus(app, request, response, respStatus, id = undefined, token = undefined) {
    let retVal = {};
    switch(respStatus) {
        case "NOT_FOUND":
            retVal.status = "ERROR_NOT_FOUND";
            retVal.info = "user " + id + " not found";
            response.status(NOT_FOUND).json(retVal);
            break;
        case "UNAUTHORIZED":
            retVal.status = "ERROR_UNAUTHORIZED";
            retVal.info = "/users/" + id + "/auth requires a valid 'pw' password query paramater";
            response.status(UNAUTHORIZED).json(retVal);
            break;
        case "OK": //needs token
            retVal.status = "OK";
            retVal.auth_token = token;
            retVal.expires_in = app.locals.authTimeout; 
            response.status(OK).json(retVal);
            break;
        case "SEE_OTHER":
            retVal.status = "EXISTS";
            retVal.info = "user " + id + " already exists";
            response.location(request.hostname + '/users/' + id );
            response.status(SEE_OTHER).json(retVal);
            break;
        case "CREATED": //needs token
            retVal.status = "CREATED";
            retVal.auth_token = token
            retVal.expires_in = app.locals.authTimeout; 
            response.location(request.hostname + '/users/' + id );
            response.status(CREATED).json(retVal);
            break;
        case "SERVER_ERROR": //does not need id or token
            response.sendStatus(SERVER_ERROR);
            break;
        case "BAD_REQUEST": //does not need id or token
            response.sendStatus(BAD_REQUEST);
            break;
        default:
            console.error("No matched case, status not sent");
            response.sendStatus(SERVER_ERROR);
            break;
    }
}

//_____________________________EXPORT_____________________________

module.exports = {
  serve: serve
}
