#!/bin/sh

echo "Heroku Api tokk: $HEROKU_API_KEY"

echo "Heroku app name: $HEROKU_APP_NAME"

curl -n -X PATCH https://api.heroku.com/apps/$HEROKU_APP_NAME/config-vars \
  -d '{
  "FOO": "bar",
  "BAZ": "qux"
}' \
  -H "Content-Type: application/json" \
  -H "Accept: application/vnd.heroku+json; version=3" \
  -H "Authorization: Bearer $HEROKU_API_KEY"
