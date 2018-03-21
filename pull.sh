#!/usr/bin/env bash
pm2 stop trader
rm -rf node_modules
git checkout master
git reset HEAD --hard
git pull
npm i
pm2 start src/main.js --name=trader