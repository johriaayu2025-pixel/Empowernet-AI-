import os
import json
from web3 import Web3
from dotenv import load_dotenv

load_dotenv()

# Minimal ABI for EvidenceRegistry contract
ABI = [
    {
        "inputs": [
            {"internalType": "string", "name": "_hash", "type": "string"},
            {"internalType": "string", "name": "_category", "type": "string"}
        ],
        "name": "anchorEvidence",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {"internalType": "string", "name": "_hash", "type": "string"}
        ],
        "name": "verifyEvidence",
        "outputs": [
            {"internalType": "bool", "name": "", "type": "bool"},
            {"internalType": "uint256", "name": "", "type": "uint256"},
            {"internalType": "string", "name": "", "type": "string"}
        ],
        "stateMutability": "view",
        "type": "function"
    }
]

class BlockchainService:
    def __init__(self):
        self.rpc_url = os.getenv("POLYGON_RPC_URL", "https://rpc-amoy.polygon.technology/")
        self.private_key = os.getenv("PRIVATE_KEY")
        self.contract_address = os.getenv("CONTRACT_ADDRESS")
        
        if not self.private_key or not self.contract_address:
            print("WARNING: Blockchain Service - Missing credentials in .env")
            self.enabled = False
            return

        self.w3 = Web3(Web3.HTTPProvider(self.rpc_url))
        if not self.w3.is_connected():
            print("ERROR: Blockchain Service - Failed to connect to Polygon")
            self.enabled = False
            return

        self.account = self.w3.eth.account.from_key(self.private_key)
        self.contract = self.w3.eth.contract(address=self.contract_address, abi=ABI)
        self.enabled = True
        print(f"SUCCESS: Blockchain Service Initialized: {self.account.address}")

    def anchor_evidence(self, evidence_hash: str, category: str):
        if not self.enabled:
            return None

        try:
            nonce = self.w3.eth.get_transaction_count(self.account.address)
            
            # Build transaction
            txn = self.contract.functions.anchorEvidence(
                evidence_hash, 
                category
            ).build_transaction({
                'chainId': 80002, # Amoy Testnet ID
                'gas': 200000,
                'gasPrice': self.w3.eth.gas_price,
                'nonce': nonce,
            })

            # Sign transaction
            signed_txn = self.w3.eth.account.sign_transaction(txn, private_key=self.private_key)
            
            # Send transaction
            txn_hash = self.w3.eth.send_raw_transaction(signed_txn.raw_transaction)
            
            # Wait for receipt
            receipt = self.w3.eth.wait_for_transaction_receipt(txn_hash)
            tx_hex = self.w3.to_hex(txn_hash)
            print(f"LINK: Evidence Anchored! Tx: {tx_hex}")
            return tx_hex

        except Exception as e:
            print(f"ERROR: Blockchain Anchoring Failed: {str(e)}")
            return None

    def verify_evidence(self, evidence_hash: str):
        if not self.enabled:
            return {"exists": False, "error": "Service disabled"}

        try:
            exists, timestamp, category = self.contract.functions.verifyEvidence(evidence_hash).call()
            return {
                "exists": exists,
                "timestamp": timestamp,
                "category": category
            }
        except Exception as e:
            print(f"ERROR: Blockchain Verification Failed: {str(e)}")
            return {"exists": False, "error": str(e)}

# Singleton instance
blockchain_service = BlockchainService()
