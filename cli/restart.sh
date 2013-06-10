#!/bin/bash

./test.sh POST /stop
./test.sh POST /reset "type=1"
./test.sh POST /start