#!/usr/bin/env nodejs

const assert = require('assert');
const mongo = require('mongodb').MongoClient;
const process = require('process');

const model = require('./model/model');
const server = require('./server/server');
const options = require('./options');
  
const PORT = options.options.port;
const AUTH_TIMEOUT = options.options.authTimeout;
const SSL_DIR = options.options.sslDir;
const DB_URL = options.options.dbUrl;

mongo.connect(DB_URL).
  then(function(db) {
    const model1 = new model.Model(db);
    server.serve(PORT, AUTH_TIMEOUT, SSL_DIR, model1);
    //db.close();
  }).
  catch((e) => console.error(e));
