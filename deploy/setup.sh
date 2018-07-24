#!/bin/bash
sudo apt install git-all
curl -sL https://deb.nodesource.com/setup_8.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g n
sudo n latest
sudo npm install pm2 -g
ssh-keygen
cd ~/
git clone git@bitbucket.org:lootlabs/trader.git