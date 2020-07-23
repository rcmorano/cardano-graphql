#!/usr/bin/env bash

set -ex
TESTNET_MAGIC=42
#
# In order to run the graphql tests you need some addresses set up on the testnet with funds
# Run it from inside the graphql docker container. e.g. docker exec -t ./app/mk-addresses.sh
# You will then need to add some ada to the payment.addr using https://testnets.cardano.org/en/shelley/tools/faucet/
#

# All taken from https://github.com/input-output-hk/cardano-tutorials/blob/master/node-setup/020_keys_and_addresses.md


# build the stake address
cardano-cli shelley stake-address key-gen \
--verification-key-file stake.vkey \
--signing-key-file stake.skey

cardano-cli shelley stake-address build \
--stake-verification-key-file stake.vkey \
--out-file stake.addr \
--testnet-magic $TESTNET_MAGIC

# build the first payment address, this is the address that you will send payments from in the tests, it needs funds to be added
cardano-cli shelley address key-gen \
--verification-key-file payment.vkey \
--signing-key-file payment.skey

cardano-cli shelley address build \
--payment-verification-key-file payment.vkey \
--stake-verification-key-file stake.vkey \
--out-file payment.addr \
--testnet-magic $TESTNET_MAGIC

# build the second payment address, this is the address that you will send payments to in the tests and it needs no funds
cardano-cli shelley address key-gen \
--verification-key-file payment2.vkey \
--signing-key-file payment2.skey

cardano-cli shelley address build \
--payment-verification-key-file payment2.vkey \
--stake-verification-key-file stake.vkey \
--out-file payment2.addr \
--testnet-magic $TESTNET_MAGIC

# This is the address you need to add funds to using https://testnets.cardano.org/en/shelley/tools/faucet/
cat payment.addr