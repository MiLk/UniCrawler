#!/bin/bash

PROXY=
URL=http://localhost:8081

if [ ! -z $PROXY ]; then
  export http_proxy=$PROXY
fi

if [ -z $3 ]; then
  curl -i -X $1 $URL$2
else
  curl -i -X $1 $URL$2 -d $3
fi

echo
echo