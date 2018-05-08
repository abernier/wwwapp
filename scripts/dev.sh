#!/bin/sh

docker-compose config || exit 1

docker-compose build test-unit || exit 1
docker-compose run --service-ports test-unit /bin/sh || exit 1