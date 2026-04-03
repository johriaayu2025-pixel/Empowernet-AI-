import os
from web3 import Web3
from dotenv import load_dotenv

load_dotenv()

rpc_url = os.getenv("POLYGON_RPC_URL", "https://rpc-amoy.polygon.technology/")
private_key = os.getenv("PRIVATE_KEY")
contract_address = os.getenv("CONTRACT_ADDRESS")

w3 = Web3(Web3.HTTPProvider(rpc_url))
print(f"DEBUG_RPC: {rpc_url}")

if not w3.is_connected():
    print("FAILED_TO_CONNECT")
    exit(0)

print(f"CONNECTED: {w3.is_connected()}")

if private_key:
    try:
        if not private_key.startswith("0x"):
            private_key = "0x" + private_key
        account = w3.eth.account.from_key(private_key)
        balance_wei = w3.eth.get_balance(account.address)
        balance_pol = w3.from_wei(balance_wei, 'ether')
        print(f"WALLET_ADDRESS: {account.address}")
        print(f"WALLET_BALANCE: {balance_pol} POL")
        
        gas_price = w3.eth.gas_price
        estimated_gas = 300000
        needed_pol = w3.from_wei(gas_price * estimated_gas, 'ether')
        print(f"NEEDED_POL: {needed_pol}")
        
    except Exception as e:
        print(f"WALLET_ERROR: {e}")

if contract_address:
    try:
        code = w3.eth.get_code(contract_address)
        print(f"CONTRACT_ADDRESS: {contract_address}")
        if code == b'' or code == '0x':
            print("CONTRACT_STATUS: MISSING")
        else:
            print(f"CONTRACT_STATUS: FOUND (Code Length: {len(code)})")
    except Exception as e:
        print(f"CONTRACT_ERROR: {e}")
