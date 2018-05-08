#!/bin/sh

docker-compose config || exit 1

docker-compose build www || exit 1
docker-compose up www || exit 1