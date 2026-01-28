# Step-by-Step Blockchain Integration Guide

This guide explains how to anchor scan results to the Polygon blockchain using the `EvidenceRegistry` smart contract.

## Phase 1: Smart Contract Deployment
1.  **Open Remix IDE**: Go to [remix.ethereum.org](https://remix.ethereum.org/).
2.  **Lcreate File**: Create a new file named `EvidenceRegistry.sol` and paste the code from [EvidenceRegistry.sol](file:///c:/Users/johri/OneDrive/Pictures/final/backend/blockchain/EvidenceRegistry.sol).
3.  **Compile**: Go to the **Solidity Compiler** tab and click **Compile EvidenceRegistry.sol**.
4.  **Deploy**:
    - Go to the **Deploy & Run Transactions** tab.
    - Set **Environment** to `Injected Provider - MetaMask`.
    - Ensure your MetaMask is on the **Polygon Amoy Testnet**.
    - Click **Deploy** and confirm in MetaMask.
5.  **Save Address**: Copy the **Deployed Contract Address** (e.g., `0x123...`).

## Phase 2: Backend Configuration
1.  **Install Web3**: Run `pip install web3` in your backend environment.
2.  **Update .env**: Add the following to your `backend/.env` file:
    ```ini
    POLYGON_RPC_URL=https://rpc-amoy.polygon.technology/
    PRIVATE_KEY=your_metamask_private_key
    CONTRACT_ADDRESS=your_deployed_contract_address
    ```
3.  **Setup Service**: Create `backend/blockchain/blockchain_service.py` to handle `web3.py` interactions with the contract.

## Phase 3: Connect to API
1.  **Modify main.py**: Import the new `blockchain_service`.
2.  **Anchor Hash**: In the `scan` endpoint, after generating the `evidence_hash`, call `blockchain_service.anchor_evidence(evidence_hash, result['category'])`.
3.  **Verification**: Update the `/api/verify` endpoint to check the blockchain registry using `blockchain_service.verify_evidence(hash)`.

## Phase 4: Frontend Verification
1.  **Scan Page**: Ensure the [ScanPage.tsx](file:///c:/Users/johri/OneDrive/Pictures/final/pages/ScanPage.tsx) shows the transaction link to [PolygonScan](https://amoy.polygonscan.com/).
2.  **History**: results stored in the history should include the `evidenceHash` for future verification.
