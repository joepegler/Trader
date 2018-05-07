#!/bin/bash
sudo yum install git
curl --silent --location https://rpm.nodesource.com/setup_8.x | sudo bash -
sudo yum -y install nodejs
sudo npm install -g n
sudo n 8.11.1
sudo npm install pm2 -g
ssh-keygen
cd ~/
git clone git@bitbucket.org:lootlabs/trader.git
bash trader/pull.sh