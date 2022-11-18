Flatex.at Order Bot
===================

A snapshot of my internal repository. Some working state I guess.

A [Matrix](https://matrix.org/) chatbot to lose money with Flatex (AT, not sure about DE). Highly overengineered and
strongly typed. Best to test this after trading hours or with orders that will never fill.

## Development setup

```shell
$ cat .envrc
PATH_add /opt/homebrew/opt/node@16/bin
PATH_add node_modules/.bin

$ cat .env
FLATEX_BASE_URL=https://flatex.guidants-trading.de/proxy
FLATEX_PRINCIPAL=123456  # username
FLATEX_CREDENTIAL=password  # password
ONVISTA_BASE_URL=https://api.onvista.de
MATRIX_HOME_SERVER_URL=https://matrix.org
MATRIX_ACCESS_TOKEN=syt_deadbeef
MATRIX_ROOM_ID=!yourfavoritechannel:matrix.org

$ npm start
```

## Quickstart

Create a Matrix bot user and enter access token + authorized channel id (a private chat e.g.). Either write `help` or
just start with the authorization process (2 FA) via `authorize`. You get a message where you need to enter your PIN, e.g.

```text
<ME>  authorize
<BOT> Enter pin via tan 12 34 56
<ME>  tan 42 00 42
<BOT> Authorization succeeded.

<ME>  cash
<BOT> 1.00 EUR available

<ME>  orders all
<BOT> ✓ 123457201 · GK4810 · 18.07.2022 12:13:14 · A71 · ×1000 · 1.00 · GOLDM.S.BK TUBEAR APC
<BOT> ✓ 123457310 · GK4810 · 18.07.2022 12:13:14 · A71 · ×1000 · 1.00 · GOLDM.S.BK TUBEAR APC
```

## Available commands

```
[command]

Commands:
  authorize                Authorize transaction PIN
  tan                      Enter pTAN
  balance                  Portfolio balance      [aliases: cash]
  securities               Portfolio securities   [aliases: depot, portfolio]
  orders [mode]            Show orders
  orders-cancel            Cancel order           [aliases: order-cancel]
  orders-buy               Place buy order        [aliases: order-buy]
  orders-sell  [qty]       Place sell order       [aliases: order-sell]
  ko                      Search for knockout certificates

Options:
  --help     Show help
  --version  Show version number
```

## Deployment

Inventory not provided.

```shell
$ cat  ansible/inventory-production/group_vars/app/vars
app_flatex_base_url: "{{ vault_app_flatex_base_url }}"
app_flatex_principal: "{{ vault_app_flatex_principal }}"
app_flatex_credential: "{{ vault_app_flatex_credential }}"
app_onvista_base_url: "{{ vault_app_onvista_base_url }}"
app_matrix_home_server: "{{ vault_app_matrix_home_server }}"
app_matrix_access_token: "{{ vault_app_matrix_access_token }}"
app_matrix_room_id: "{{ vault_app_matrix_room_id }}"

# yeet to server
$ ansible-playbook -i inventory-production deploy_app.yml
```
