# Pray Atia Telegram Mini App 

This is a basic example of integrating a web-based game in Telegram mini-app with an MPC (Multi-Party Computation) wallet.

In this example, a simple click game is implemented using the `Lockbox` and `Mavis Account` service. Both on-chain and off-chain logic are included. Every 10 clicks, the player can claim an amount of RON by calling the smart contract to claim the rewards.

Highlight benefits that both game and player have
- Create wallet with social account (Apple/Facebook/Google/email-password)
- No "Huh? Blockchain?"
- Grandma friendly

![Banner](/docs/banner.png)

## About
This example is using the following libraries and packages:
- [ReactJs (18.3.0)](https://react.dev/)
- [Vite (5.3.4)](https://vitejs.dev/)
- [Bun (1.1.13)](https://bun.sh/)
- [Lockbox (2.1.5)](https://docs.skymavis.com/mavis/mpc/overview)
- [Viem (2.17.10)](https://viem.sh/)
- [Mavis Account](https://docs.skymavis.com/mavis/mavis-account/overview)

_There are some internal packages required that are not currently publicly available. In order to use these packages, you will need to [send a request]() to be guided on how to install them._


## Quick Start

Before diving in, there are some additional setup steps required in the [Developer Portal](https://developers.skymavis.com/). This setup process can take up to 10 minutes, but the example provided here has a pre-configured working setup that you can use to immediately get the game running.

##### Development
For the package manager, this example prefers the use of `Bun`, but other package managers such as `npm`, `yarn`, or `pnpm` will also work fine.

```bash
git clone https://github.com/axieinfinity/tma-pray-atia-example
cd tma-pray-atia-example
bun install
```

Open the browser at [localhost:3000](http://localhost:3000). 

This will allow you to test the full flow of the game, from the first time a player opens the game until they become addicted.

![Banner](/docs/demo-00.png)

![Banner](/docs/demo-01.png)


> _**Note**_: Telegram does not currently provide any solutions or tools for developing Telegram Mini App within a development environment. As an alternative, you can run your game directly on a browser for an easier development process. The deployed Telegram Mini App will run exactly the same as what is shown in the browser.

##### Deploy to Telegram Mini App

The next step of creating a mini app registering a web app to our bot. This process is also straight forward, follow the instructions:

1. Deploy the game to the internet.
2. From the list of commands of the [@BotFather](https://t.me/BotFather), click on  `/newapp` or send it as a message to the chat.

3. You will be asked to choose a bot, send its playername to the chat. In our example, we used `@prayatiabot`.

4. Bot father will ask you to enter a title, in our example we used `PrayAtia`.

5. Then, you will need to enter a description, write something that describes the functionality of your game and the benefits that it will bring to its players.

6. You will be asked to upload a 640x360 photo, just send it to the chat. For the GIF step, you can send `/empty` for now.

7. Bot father will ask you to send a URL that points to the website hosting the mini app. `https`, for example `https://test-mpc-telegram-miniapp.vercel.app/`. You will need this URL later on to deploy your game.

8. Then, you will be asked to choose a short name for the web app, which will be used in direct URLs that start the app directly. We used `pray` so our URL looks like this [`t.me/prayatiabot/pray`](https://t.me/prayatiabot/pray).


## Breakdown

The authentication and wallet creation processes are closely intertwined. The image below illustrates the complete flow that the game must implement in order to allow players to create their wallets and interact with the smart contract seamlessly.

![Banner](/docs/diagram.png)

The example game is built using ReactJS to directly create a web-based game. If you are interested in building the game on a different engine, here are the `core functions and steps`.

The full code for this functionality is located in the `src/use-mpc.ts` file. You can walk through this file to gain a better understanding of the overall concept.

1. Authorize the player with Mavis Account
```ts
// ...
const codeVerifier = generateRandomString()
const codeChallenge = generateCodeChallenge(codeVerifier)

const loginOptions = {
  response_type: 'code',
  request_type: 'login',
  scope: 'openid',
  client_id: OIDC_CLIENT_ID,
  redirect_uri: OIDC_CALLBACK_URL,
  remember: 'true',
  state: crypto.randomUUID(),
  code_challenge: codeChallenge,
  code_challenge_method: 'S256',
}

const url = new URL(OIDC_AUTHORIZATION_ENDPOINT)
url.search = new URLSearchParams(loginOptions).toString()

window.location.replace(url)

// Mavis Account will direct back to the callback url with attach params
// extract it and exchange the token to get the player access_token
exchangeToken(params.code, OIDC_CALLBACK_URL, codeVerifier)
  .then((data) => {
    createLockbox(data.access_token)
  })
  .catch((error) => {
    console.log('Error exchanging token', error)
  })
```

2. Creating a Lockbox instance
```ts
const lockbox = Lockbox.init({
  chainId: CHAIN_ID,
  accessToken,
  serviceEnv: "prod",
})
```
3. Generate the mpc wallet
```ts
const shardData = await lockbox.genMpc()
```
4. **Important!** Backup the player's shard
```ts
const password = 'placeholder-password' // take the player input

const encryptedClientShard = await lockbox.encryptClientShard(password, password.length)
await lockbox.backupClientShard(encryptedClientShard.encryptedKey)
```
5. Update client shard for the lockbox instance
```ts
lockbox.setClientShard(shardData.key)
```
6. Call the smart contract. This example uses `viem` library to encode the data for the smart contract interaction
```ts
const data = encodeFunctionData({
  abi: abi,
  functionName: 'claimReward',
})

const hash = await lockbox.sendTransaction({
  to: PRAY_CONTRACT_ADDRESS,
  data,
  type: '0x64', // For sponsor transaction
})
```

## Checklists

Before air your game to production and bringing fun to your players, here are some "nice-to-have" recommendations:
- **Handle unexpected internet outages:** Internet connectivity can be unreliable, and if a player's wallet creation is interrupted, it's important to have a feature that can gracefully handle this situation.
- **Implement a lockbox for secure transactions:** Lockbox provide a satisfying UX by allowing players to send transactions without confirmation. However, it's also important to add a barrier for transactions involving large sums of money to ensure the security of the player's funds.
- **Sponsor transactions for new players:** Don't scare the new player by force them to fund the wallet to interact with the game. We provide `sponsor transaction` for this use case.

## FAQ

1. **Is it only available for ReactJS?**
A: No, it is available for all web frameworks as long as you are using `TypeScript/JavaScript`. Furthermore, if you are building your game with a game engine `Unity, Cocos, Godot` and want to bring it to the Telegram Mini App, [let us know]() and we will guide you on how to integrate it.
2. **Is there any way to backup the shard instead of using `backupClientShard()`?**
A: We encourage using our service through `backupClientShard()` for backing up the shard.
3. **If I don't use a `fixed passphrase`, how can my players create a wallet and retrieve their wallet when they log back in?**
A: You need to implement a way (an input field) for players to enter their passphrase before creating a wallet and retrieving their wallet.