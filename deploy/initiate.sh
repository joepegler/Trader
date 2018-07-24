#!/bin/bash
set -e

### Configuration ###

SERVER=ubuntu@ec2-18-191-230-179.us-east-2.compute.amazonaws.com
APP_DIR=/home/ubuntu/trader
KEYFILE=/home/joe/.ssh/work_laptop_public_key.pub
REMOTE_SCRIPT_PATH=/tmp/deploy-myapp.sh


### Library ###

function run()
{
  echo "Running: $@"
  "$@"
}


### Automation steps ###

if [[ "$KEYFILE" != "" ]]; then
  KEYARG="-i $KEYFILE"
else
  KEYARG=
fi

run scp $KEYARG deploy/work.sh $SERVER:$REMOTE_SCRIPT_PATH
echo
echo "---- Running deployment script on remote server ----"
run ssh $KEYARG $SERVER bash $REMOTE_SCRIPT_PATH
