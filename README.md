# OGM NFT Contract

## What is OGM 
 OGM is Digtial Asset that follows ERC721 Standard that allows user to battle with other OGMs

## Installation 

  ```
  git clone https://github.com/NirajBhattarai/OGM-Contract
  npm install 

  ```
## Contract Deployment
Make .env File within project an Paste required enviroment variables.
After Completing Above

```
npx hardhat run --network networkname scripts/deploy.js

```
### Verify Contract

```
 npx hardhat verify --network networkname contractAddresss
```
!Note You will get Contract Address from Above Script

## Run Test 

```
npm run test

```



