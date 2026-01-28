import { Wallet } from "ethers";

try {
    const wallet = Wallet.createRandom();
    console.log("---------------------------------------");
    console.log("NEW WALLET GENERATED SUCCESSFULLY");
    console.log("---------------------------------------");
    console.log("Public Address:", wallet.address);
    console.log("Private Key:   ", wallet.privateKey);
    console.log("---------------------------------------");
    console.log("IMPORTANT: Save this Private Key in your .env file.");
    console.log("NEVER share this key with anyone or upload it to GitHub.");
    console.log("---------------------------------------");
} catch (error) {
    console.error("Error generating wallet:", error.message);
}
