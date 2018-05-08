#!/bin/sh

docker-compose config || exit 1

docker-compose build test-unit || exit 1
docker-compose run test-unit || exit 1