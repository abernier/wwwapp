[![Build Status](https://travis-ci.com/goodenough/wwwapp.svg?token=g5Zf9yE4s4QpfXZyPTpg&branch=master&maxAge=0)](https://travis-ci.com/goodenough/wwwapp) [![Coverage Status](https://coveralls.io/repos/github/goodenough/wwwapp/badge.svg?t=TsRjda)](https://coveralls.io/github/goodenough/wwwapp)

[![Sauce Test Status](https://saucelabs.com/browser-matrix/abernier_.svg)](https://saucelabs.com/u/abernier_)

## Dev

### Deploy

```sh
sh -c "./wwwapp deploy --herokuapp=myapp"
```

### Start a shell within the Docker container:

```sh
(host) $ ./wwwapp dev
(container) # 
```

### Build and start the webapp:

```sh
(container) # make && node --inspect=0.0.0.0:9229 server
```

### Launch a unit-test with debugging ON:

  1. In Chrome, go to `chrome://inspect` and click on `Open dedicated DevTools for Node`
     ![](https://i.imgur.com/bshN2WO.png)
  3. Launch your test
     ```sh
     (container) # ./node_modules/.bin/tap --node-arg=--inspect=0.0.0.0:9229 --no-timeout --bail test/unit/users-sessions.js
     ```

### Nota-bene

To enabled Saucelabs on Travis (https://travis-ci.com/goodenough/wwwapp/settings) :

```
wwwapp_saucelabs_username: abernier_
wwwapp_saucelabs_accesskey: ************
wwwapp_selenium_hub__hostname: sc
wwwapp_selenium_hub__port: 4445
wwwapp_selenium_capabilities__0__browserName: chrome
wwwapp_selenium_capabilities__0__platform: "Windows 10"
wwwapp_selenium_capabilities__1__browserName: firefox
wwwapp_selenium_capabilities__1__platform: "Windows 10"
```

### Memo

#### Flash messages

```
req.session.messages.flash.push({
  type: 'info',
  message: "Cette reconnaissance est maintenant acceptée."
});
```

#### body values

 - `res.locals._settings.body.email = ` -- to current the view
 - `req.session.body.email = ` -- to the next view

#### messages

 - `res.locals._settings.messages.flash.push(` -- push a flash message to the current view
 - `req.session.messages.flash.push(` -- push a flash message to the next view

## INSTALL

Requirements:

 - [Docker](https://www.docker.com/community-edition#/download)

```sh
./wwwapp start
```

Then go to [http://localhost:3000](http://localhost:3000)

#### Configuration

wwwapp has a decent default configuration (see [env-dist.sh](https://github.com/goodenough/wwwapp/blob/master/conf/env-dist.sh)).

However, you *may* want to override any of its values, in sereval ways:

1.  command line arguments: `node server --selenium_capabilities__2__platform=Windows\ 10`
2.  shell or environment `wwwapp_*` variables:
	1. shell: `wwwapp_selenium_capabilities__2__platform="Windows 10" node server`
	2. environment: `export wwwapp_selenium_capabilities__2__platform="Windows 10" && node server`
3.  config file (INI or JSON):
    1.  passed from command line: `node server --config /path/to/config.ini`
    2.  a `.wwwapprc` file found somewhere at (in order):
        1.  local: `.` but also `../`, `../../`, `../../../`, ...
        2.  home: `$HOME/.wwwapprc` or `$HOME/.wwwapp/config` or `$HOME/.config/wwwapp` or `$HOME/.config/wwwapp/config`
        3.  etc: `/etc/wwwapprc` or `/etc/wwwapp/config`

NB: In case of 3., just have a copy of the `defaults.json` file.

## API

### General

#### Cors

CORS is enabled

#### Content-negociation

API supports content-negociation.

Default `Accept` and `Content-Type` headers are `application/json` by default if ommited.

#### Client errors

```
HTTP/1.1 422 Unprocessable Entity

{
  "error": [
    {
      "field": "firstname",
      "code": "missing",
      "message": "Please enter a firstname"
    },
    {
      "field": "price",
      "code": "invalid"
    }
  ],
  "message": "Validation failed",
  "stack": "..."
}
```

### Users

#### `HEAD /users/1` or `HEAD /users?email=antoine.bernier@gmail.com` -- `public`

```
curl -i -XHEAD http://localhost:3000/users?email=antoine.bernier@gmail.com

HTTP/1.1 204 No Content
```

or `HTTP/1.1 404 Not Found`

#### `PUT /users/valid` or `PUT /users/1/valid` -- `public`

```
curl -i -XPUT http://localhost:3000/users/valid -d @-
{
  "email": "antoine.bernier@gmail.com",
  "quickregister": true,
  "g-recaptcha-response": ""
}

HTTP/1.1 204 No Content
```

or `HTTP/1.1 422 Unprocessable Entity` if not valid.

* NB1: in `quickregister` mode, only `g-recaptcha-response` and one of `email`|`facebookid`|`googleid` and are mandatory.
* NB2: without `quickregister`, additionnal fields are required, ie: `tos`, `firstname`, `lastname`, `birthday`.

An example for an already registered user:

```
curl -i -XPUT http://localhost:3000/users/1/valid -d @-
{
  "email": "antoine.bernier@gmail.com",
  "tos": true,
  "firstname": "Antoine"
  "lastname": "BERNIER",
  "birthday": "05/16/1982"
}

HTTP/1.1 204 No Content
```

#### `GET /users/new` -- `public`

HTML form to create a user.

```
curl -i -XGET http://localhost:3000/users/new  -H"Accept: text/html"

HTTP/1.1 200 ok
```

#### `POST /users` -- `public`

```
curl -i -XPOST http://localhost:3000/users -d @-
{
  "email": "antoine.bernier@gmail.com",
  "quickregister": 1,
  "g-recaptcha-response": ""
}

HTTP/1.1 201 Created
Set-Cookie: WwwappAuthSession=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpZCI6OSwicGFzc3dvcmQiOiI2ODg5ZWMwNzE1NTNhNzU3MTk4M2UyNjIwYTIxYmJjZWRlNmM5MmU0IiwiaWF0IjoxNDYyMjgyNTIwfQ.AOBXwusUyue-hlgzDUMO3CjpO1h17Xy_zBWytNnnQcM; Version=1; Path=/; HttpOnly
{
  ...
}
```

#### `GET /users/1` -- `private`

```
curl -i -XGET http://localhost:3000/users/1 -H"Cookie:WwwappAuthSession=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpZCI6MSwicGFzc3dvcmQiOiI3ODQ2NjVmMzViYzQxMzIyNzRiMjZlNTg3ZGVjY2IzYjU4OWJmZWUyIiwiaWF0IjoxNDYzNTc1MDcxfQ.C7b0apEn5uBC8kOpQ62M9dgIW2ZxE3megCibbUxWuYw"

HTTP/1.1 200 ok
{
  ...
}
```

or `HTTP/1.1 403 Forbidden` if not owner
or `HTTP/1.1 401 Unauthorized`

#### `PUT /users/1` -- `private`

```
curl -i -XPUT http://localhost:3000/users/1 -H"Cookie:WwwappAuthSession=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpZCI6MSwicGFzc3dvcmQiOiI3ODQ2NjVmMzViYzQxMzIyNzRiMjZlNTg3ZGVjY2IzYjU4OWJmZWUyIiwiaWF0IjoxNDYzNTc1MDcxfQ.C7b0apEn5uBC8kOpQ62M9dgIW2ZxE3megCibbUxWuYw" \
-d @-
{
  "email": "a@b.com"
}

HTTP/1.1 200 Ok
{
  ...
}
```

#### `DELETE /users/1` -- `private`

```
curl -i -XDELETE http://localhost:3000/users/1 -H"Cookie:WwwappAuthSession=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpZCI6MSwicGFzc3dvcmQiOiI3ODQ2NjVmMzViYzQxMzIyNzRiMjZlNTg3ZGVjY2IzYjU4OWJmZWUyIiwiaWF0IjoxNDYzNTc1MDcxfQ.C7b0apEn5uBC8kOpQ62M9dgIW2ZxE3megCibbUxWuYw"

HTTP/1.1 204 No Content
```

### Sessions

#### `PUT /sessions/valid` -- `public`

```
curl -i -XPUT http://localhost:3000/sessions/valid -d @-
{
  "email": "antoine.bernier@gmail.com",
  "password": "toto123+"
}

HTTP/1.1 204 No Content
```

or `HTTP/1.1 422 Unprocessable Entity` if not valid.

#### `POST /sessions`

```
curl -i -XPOST http://localhost:3000/sessions -d @-
{
  "email": "antoine.bernier@gmail.com",
  "password": "toto123+"
}

HTTP/1.1 201 Created
Set-Cookie: WwwappAuthSession=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpZCI6OSwicGFzc3dvcmQiOiI2ODg5ZWMwNzE1NTNhNzU3MTk4M2UyNjIwYTIxYmJjZWRlNmM5MmU0IiwiaWF0IjoxNDYyMjgyNTIwfQ.AOBXwusUyue-hlgzDUMO3CjpO1h17Xy_zBWytNnnQcM; Version=1; Path=/; HttpOnly
{
  user: {id: 1, ...}
}
```

or `HTTP/1.1 401 Unauthorized`

You can also create a session using the user's `id`:

```
curl -i -XPOST http://localhost:3000/sessions -d @-
{
  "id": 1,
  "password": "toto123+"
}

HTTP/1.1 201 Created
Set-Cookie: WwwappAuthSession=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpZCI6OSwicGFzc3dvcmQiOiI2ODg5ZWMwNzE1NTNhNzU3MTk4M2UyNjIwYTIxYmJjZWRlNmM5MmU0IiwiaWF0IjoxNDYyMjgyNTIwfQ.AOBXwusUyue-hlgzDUMO3CjpO1h17Xy_zBWytNnnQcM; Version=1; Path=/; HttpOnly
{
  user: {id: 1, ...}
}
```

#### `GET /session`

```
curl -i -XGET http://localhost:3000/session -H"Cookie:WwwappAuthSession=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpZCI6OSwicGFzc3dvcmQiOiI2ODg5ZWMwNzE1NTNhNzU3MTk4M2UyNjIwYTIxYmJjZWRlNmM5MmU0IiwiaWF0IjoxNDYyMjgyNTIwfQ.AOBXwusUyue-hlgzDUMO3CjpO1h17Xy_zBWytNnnQcM"

HTTP/1.1 200 Ok
{
  user: {id: 1, ...}
}
```

#### `DELETE /session`

```
curl -i -XDELETE http://localhost:3000/session -H"Cookie:WwwappAuthSession=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpZCI6OSwicGFzc3dvcmQiOiI2ODg5ZWMwNzE1NTNhNzU3MTk4M2UyNjIwYTIxYmJjZWRlNmM5MmU0IiwiaWF0IjoxNDYyMjgyNTIwfQ.AOBXwusUyue-hlgzDUMO3CjpO1h17Xy_zBWytNnnQcM"

HTTP/1.1 204 No Content
```

or

`HTTP/1.1 401 Unauthorized`

#### `GET /sessions/facebook`

`HTTP/1.1 302`

#### `GET /sessions/google`

`HTTP/1.1 302`

### Tokens (aka. magiclinks)

#### `GET /tokens/new`

HTML form a user can use to send him a magiclink

#### `POST /tokens`

Route that handles token generation.

```
curl -XPOST http://localhost:3000/tokens -d @-
{
  "email": "antoine.bernier@gmail.com"
}

HTTP/1.1 204 No Content
```

#### `GET /tokens/{token}`

Route that log-in a user with a previously generated token.

```
curl -XGET http://localhost:3006/tokens/{token}

HTTP/1.1 204 No Content
Set-Cookie: WwwappAuthSession=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpZCI6OSwicGFzc3dvcmQiOiI2ODg5ZWMwNzE1NTNhNzU3MTk4M2UyNjIwYTIxYmJjZWRlNmM5MmU0IiwiaWF0IjoxNDYyMjgyNTIwfQ.AOBXwusUyue-hlgzDUMO3CjpO1h17Xy_zBWytNnnQcM; Version=1; Path=/; HttpOnly
```

NB: token is 40 characters long and composed only of `[a-zA-Z0-9_-]`

or `HTTP/1.1 404 Not Found` if not found token or expired

## Stack

- Docker (17.06.2-ce) & Docker Compose (1.14.0)
- Travis CI
- Selenium
- Saucelabs & Sauce Connect
- Node (8.9.4-alpine)
- Postgres (10.1-alpine)
- Redis (4.0.2-alpine)
- Express 4
- GNU Make (4.2.1)
- Backbone
- Browserify
- Maildev
- PrinceXML (11.3)
- m4 (1.4.18)
- pdftk 2.02

## Notes

### Saucelabs

- Dashboard: https://saucelabs.com/beta/dashboard/tests
- desired capabilities: https://wiki.saucelabs.com/display/DOCS/Platform+Configurator#/
- Sauce connect: https://github.com/ustwo/docker-sauce-connect

### Docker

- https://github.com/jwilder/dockerize#waiting-for-other-dependencies
- https://www.digitalocean.com/community/tutorials/how-to-read-and-set-environmental-and-shell-variables-on-a-linux-vps
- https://docs.docker.com/engine/userguide/eng-image/dockerfile_best-practices/

### Social

- Facebook: https://developers.facebook.com/apps
- Google: https://console.developers.google.com

```sh
./bin/env env*.sh >/tmp/.wwwappenv && docker-compose config
```

```sh
$ docker-compose build test-unit
$ docker-compose run test-unit /bin/sh
/home/node/app # make test-unit
```

##

```
req.session.user

req.session.body
req.session.message
```
