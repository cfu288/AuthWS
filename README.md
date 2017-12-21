Web Authentication REST API

Using Node, Express, MongoDB

This authentication service can be started the following way:
    
    ```./index.js [ -t|--auth-time AUTH_TIME ] [ -d|--ssl-dir SSL_DIR ] PORT```
    
  * -t | --auth-time : The time in seconds before an authentication token times out. If not specified, the value should default to 300 seconds.
  * -d | --ssl-dir : The path to the directory containing SSL credential files key.pem and cert.pem. If not specified, the value should default to the directory from which the server was started.

This authentication service responds to the following relative URLs:

  * *PUT /users/ID?pw=PASSWORD*
    * This request creates a new user with ID and PASSWORD specified above, must have a body with the json object with the data you want to store with this user.
    * If user with the same ID/username exists, this service returns a 303 with the location header set to the absolute URL for /users/ID and retureturns the body: 
    ```
    { "status": "EXISTS",
      "info": "user <ID> already exists"
    }
    ```
    * Otherwise we create a new user and return a 201 with the body:
    ```
    { "status": "CREATED",
      "authToken":` "<authToken>", 
    }
    ```
 
 * *PUT /users/ID/auth*
    * This request must contain a json body in the form of ``` {"pw": PASSWORD}```
    * If everything is correct, the following will be returned:
    ```
    { "status": "OK",
      "authToken":` "<authToken>", 
    }
    ```
    * If pw is incorrect or not present: 
    ```
    { "status": "ERROR_UNAUTHORIZED",
      "info": "/users/<ID>/auth requires a valid 'pw' password query parameter"
    }
    ```
    * If ID is not found:
    ```
    { "status": "ERROR_NOT_FOUND",
      "info": "user <ID> not found"
    }
    ```
 
 * *GET /users/ID*
    * This request must have a Authorization: Bearer <authToken> header where the auth token is the one returned in previoud put requests.
    * If everything is correct, json data stored upon creation of the user is returned
    * If ID is not found, a 404 is returned with the body:
    ```
    { "status": "ERROR_NOT_FOUND",
      "info": "user <ID> not found"
    }
    ```
    * If there is an issue with the auth header or it is missing, a 400 will be sent.
    * If the token is wrong, a 401 will be sent with the body:
    ```
    { "status": "ERROR_UNAUTHORIZED",
      "info": "/users/<ID> requires a bearer authorization header"
    }
    ```

