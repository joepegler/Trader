CREATE DATABASE IF NOT EXISTS lootlabs;
USE lootlabs;

CREATE TABLE IF NOT EXISTS positions (
    id INTEGER NOT NULL AUTO_INCREMENT,
    installments INTEGER NOT NULL,
    size FLOAT,
    ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    pair text,
    done boolean,
    side text,
    profit FLOAT,
    PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS orders (
    id INTEGER NOT NULL AUTO_INCREMENT,
    position_id INTEGER,
    side text NOT NULL,
    amount FLOAT NOT NULL,
    ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    pair text NOT NULL,
    done boolean DEFAULT false,
    PRIMARY KEY (id),
    FOREIGN KEY (position_id) REFERENCES positions(id)
);

CREATE TABLE IF NOT EXISTS trades (
    id bigint NOT NULL AUTO_INCREMENT,
    order_id INTEGER NOT NULL,
    side text NOT NULL,
    amount FLOAT NOT NULL,
    ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    pair text NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY (order_id) REFERENCES orders(id)
);
