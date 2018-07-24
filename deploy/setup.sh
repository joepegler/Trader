#!/bin/bash
sudo apt install git-all
curl -sL https://deb.nodesource.com/setup_8.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g n
sudo n latest
sudo npm install pm2 -g
ssh-keygen -t rsa
chmod 600 ~/.ssh/id_rsa.pub
echo "Host bitbucket.org" >> ~/.ssh/config
echo " IdentityFile ~/.ssh/id_rsa" >> ~/.ssh/config
cd ~/
git clone git@bitbucket.org:lootlabs/trader.git