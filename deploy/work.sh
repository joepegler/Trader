#!/bin/bash
set -e

### Configuration ###

APP_DIR=/home/ubuntu/trader
GIT_URL=git://github.com/myusername/myapp
RESTART_ARGS=

# Uncomment and modify the following if you installed Passenger from tarball
#export PATH=/path-to-passenger/bin:$PATH


### Automation steps ###

set -x

# Add ssh key
ssh-add ~/.ssh/id_rsa

# Pull latest code
if [[ -e $APP_DIR ]]; then
  cd $APP_DIR
  git checkout master
  git reset HEAD --hard
  git pull
else
  git clone $GIT_URL $APP_DIR
  cd $APP_DIR
fi

# Stop program
pm2 stop trader

# Remove old dependencies
rm -rf node_modules

# Install dependencies
npm install --production
npm prune --production

# Restart app
pm2 start src/main.js --name trader