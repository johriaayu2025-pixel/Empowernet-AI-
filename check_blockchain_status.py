import os
from web3 import Web3
from dotenv import load_dotenv

load_dotenv()

rpc_url = os.getenv("POLYGON_RPC_URL", "https://rpc-amoy.polygon.technology/")
private_key = os.getenv("PRIVATE_KEY")
contract_address = os.getenv("CONTRACT_ADDRESS")

w3 = Web3(Web3.HTTPProvider(rpc_url))

if not w3.is_connected():
    print("FAILED to connect to RPC")
    exit(1)

print(f"Connected to Amoy: {w3.is_connected()}")

if private_key:
    account = w3.eth.account.from_key(private_key)
    balance_wei = w3.eth.get_balance(account.address)
    balance_pol = w3.from_wei(balance_wei, 'ether')
    print(f"Address: {account.address}")
    print(f"Balance: {balance_pol} POL")
    
    gas_price = w3.eth.gas_price
    print(f"Current Gas Price: {w3.from_wei(gas_price, 'gwei')} gwei")
    
    estimated_gas = 300000
    needed_pol = w3.from_wei(gas_price * estimated_gas, 'ether')
    print(f"Needed for 1 tx: ~{needed_pol} POL")
    
    if balance_pol < needed_pol:
        print("RESULT: Insufficient funds. That's why it's falling back to simulation.")
    else:
        print("RESULT: Sufficient funds found.")

if contract_address:
    code = w3.eth.get_code(contract_address)
    if code == b'' or code == '0x':
        print(f"RESULT: Contract NOT found at {contract_address}")
    else:
        print(f"RESULT: Contract found at {contract_address}")
