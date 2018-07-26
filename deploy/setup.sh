#!/bin/bash
sudo apt install git-all mysql-server
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

# sudo mysql -u root
# USE mysql;
# CREATE USER 'ubuntu'@'localhost' IDENTIFIED BY 'r32kYj8MwjzHnWhrLACH';
# GRANT ALL PRIVILEGES ON *.* TO 'ubuntu'@'localhost';
# UPDATE user SET authentication_string=password('r32kYj8MwjzHnWhrLACH'), plugin='mysql_native_password' WHERE User='ubuntu';
# FLUSH PRIVILEGES;
# exit;