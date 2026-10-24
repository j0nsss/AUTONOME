import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

for (const name of ["DEPLOYER", "REQUESTER", "WORKER_1", "WORKER_2"]) {
  const pk = generatePrivateKey();
  console.log(`${name}_PRIVATE_KEY=${pk}   # ${privateKeyToAccount(pk).address}`);
}
console.log("\n⚠ TESTNET ONLY. Paste the KEY lines into .env. Fund the DEPLOYER address at https://faucet.monad.xyz");
