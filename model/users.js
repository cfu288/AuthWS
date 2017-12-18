const assert = require('assert');
const ObjectID = require('mongodb').ObjectID;

const USERS = 'users';

function Users(db) {
  this.db = db;
  this.users = db.collection(USERS);
}

//used in put
Users.prototype.newUser = function(jsonBody) {
  return this.users.insertOne(jsonBody).
    then(function(results) {
      return new Promise((resolve) => resolve(results.insertedId));      
    });
}

//used in get
Users.prototype.getUser = function(id) {
  const searchSpec = { _id: id };
  return this.users.find(searchSpec).toArray().
    then(function(users) {
      return new Promise(function(resolve, reject) {
	if (users.length === 1) {
	  resolve(users[0]);
	}
	else {
	  reject(new Error(`cannot find user ${id}`));
	}
      });
    });
}

//used for delete
Users.prototype.deleteUser = function(id) {
  return this.users.deleteOne({_id: id}).
    then(function(results) {
      return new Promise(function(resolve, reject) {
	if (results.deletedCount === 1) {
	  resolve();
	}
	else {
	  reject(new Error(`cannot delete user ${id}`));
	}
      });
    });
}

//used in post,put
Users.prototype.updateUser = function(user) {
  const userSpec = { _id: user._id };
  return this.users.replaceOne(userSpec, user).
    then(function(result) {
      return new Promise(function(resolve, reject) {
	if (result.modifiedCount != 1) {
	  reject(new Error(`updated ${result.modifiedCount} users`));
	}
	else {
	  resolve();
	}
      });
    });
}

module.exports = {
  Users: Users,
};
