import { ethers } from 'ethers';

// ABI du contrat Leads
const LEADS_ABI = [
  {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "bd_id",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "lead_amount",
        "type": "uint256"
      }
    ],
    "name": "LeadsBought",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "lead_amount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "bd_id",
        "type": "uint256"
      }
    ],
    "name": "buyLead",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "bd_id",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "user",
        "type": "address"
      }
    ],
    "name": "getLeads",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "price_base",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "price_high",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "price_low",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "price_medium",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "new_price_base",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "new_price_medium",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "new_price_high",
        "type": "uint256"
      }
    ],
    "name": "setPrice",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "new_target",
        "type": "address"
      }
    ],
    "name": "setTarget",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "target",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

// Configuration
const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS || "0xA55cD301A354Fdffcfa494eFD8A218440bbf227E";
const NETWORK_RPC = process.env.REACT_APP_NETWORK_RPC || "https://mainnet.base.org";
const NETWORK_CHAIN_ID = parseInt(process.env.REACT_APP_NETWORK_CHAIN_ID) || 8453; // Base mainnet

class Web3Service {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.contract = null;
    this.isConnected = false;
  }

  // Connecter au wallet
  async connectWallet() {
    try {
      // Vérifier si MetaMask est disponible
      if (typeof window.ethereum === 'undefined') {
        throw new Error('MetaMask is not installed. Please install MetaMask to use this feature.');
      }

      // Vérifier et demander le bon réseau (Base)
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      if (chainId !== `0x${NETWORK_CHAIN_ID.toString(16)}`) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: `0x${NETWORK_CHAIN_ID.toString(16)}` }],
          });
        } catch (switchError) {
          // Si le réseau n'existe pas, l'ajouter
          if (switchError.code === 4902) {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: `0x${NETWORK_CHAIN_ID.toString(16)}`,
                chainName: 'Base',
                nativeCurrency: {
                  name: 'ETH',
                  symbol: 'ETH',
                  decimals: 18
                },
                rpcUrls: [NETWORK_RPC],
                blockExplorerUrls: ['https://basescan.org']
              }],
            });
          } else {
            throw switchError;
          }
        }
      }

      // Demander la connexion au wallet
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });

      if (accounts.length === 0) {
        throw new Error('No accounts found. Please connect your wallet.');
      }

      // Créer le provider et le signer
      this.provider = new ethers.BrowserProvider(window.ethereum);
      this.signer = await this.provider.getSigner();
      
      // Créer l'instance du contrat
      this.contract = new ethers.Contract(CONTRACT_ADDRESS, LEADS_ABI, this.signer);
      
      this.isConnected = true;
      
      return {
        address: accounts[0],
        success: true
      };
    } catch (error) {
      console.error('Error connecting wallet:', error);
      throw error;
    }
  }

  // Acheter des leads
  async buyLeads(leadAmount, bdId = 2) {
    try {
      if (!this.isConnected || !this.contract) {
        throw new Error('Wallet not connected. Please connect your wallet first.');
      }

      // Calculer le prix selon la logique du contrat
      let pricePerLead;
      if (leadAmount > 50) {
        pricePerLead = await this.contract.price_high();
      } else if (leadAmount > 25) {
        pricePerLead = await this.contract.price_medium();
      } else {
        pricePerLead = await this.contract.price_base();
      }
      
      if (bdId === 1) {
        pricePerLead = await this.contract.price_low();
      }

      // Calculer le prix total
      const totalPrice = pricePerLead * ethers.getBigInt(leadAmount);
      
      console.log(`💰 Achat de ${leadAmount} leads pour ${ethers.formatEther(totalPrice)} ETH`);

      // Exécuter la transaction
      const tx = await this.contract.buyLead(leadAmount, bdId, {
        value: totalPrice
      });

      // Attendre la confirmation
      const receipt = await tx.wait();
      
      console.log('✅ Transaction confirmée:', receipt.hash);
      
      return {
        success: true,
        hash: receipt.hash,
        leads: leadAmount,
        price: ethers.formatEther(totalPrice)
      };
    } catch (error) {
      console.error('Error buying leads:', error);
      throw error;
    }
  }

  // Récupérer le nombre de leads achetés
  async getLeadsForUser(userAddress, bdId = 2) {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized');
      }

      // Utiliser l'interface pour encoder l'appel
      const iface = new ethers.Interface([
        "function getLeads(uint256 bd_id, address user) view returns (uint256)"
      ]);
      
      const data = iface.encodeFunctionData("getLeads", [bdId, userAddress]);
      
      // Appeler directement via le provider
      const result = await this.provider.call({
        to: CONTRACT_ADDRESS,
        data: data
      });
      
      if (result === '0x') {
        return 0;
      }
      
      const decoded = iface.decodeFunctionResult("getLeads", result);
      return parseInt(decoded[0].toString());
    } catch (error) {
      console.error('Error getting leads:', error);
      return 0;
    }
  }

  // Récupérer les prix actuels
  async getPrices() {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized');
      }

      // Utiliser l'interface pour encoder les appels
      const iface = new ethers.Interface([
        "function price_base() view returns (uint256)",
        "function price_medium() view returns (uint256)",
        "function price_high() view returns (uint256)",
        "function price_low() view returns (uint256)"
      ]);

      const [priceBaseData, priceMediumData, priceHighData, priceLowData] = [
        iface.encodeFunctionData("price_base"),
        iface.encodeFunctionData("price_medium"),
        iface.encodeFunctionData("price_high"),
        iface.encodeFunctionData("price_low")
      ];

      const [priceBaseResult, priceMediumResult, priceHighResult, priceLowResult] = await Promise.all([
        this.provider.call({ to: CONTRACT_ADDRESS, data: priceBaseData }),
        this.provider.call({ to: CONTRACT_ADDRESS, data: priceMediumData }),
        this.provider.call({ to: CONTRACT_ADDRESS, data: priceHighData }),
        this.provider.call({ to: CONTRACT_ADDRESS, data: priceLowData })
      ]);

      const [priceBase, priceMedium, priceHigh, priceLow] = [
        iface.decodeFunctionResult("price_base", priceBaseResult)[0],
        iface.decodeFunctionResult("price_medium", priceMediumResult)[0],
        iface.decodeFunctionResult("price_high", priceHighResult)[0],
        iface.decodeFunctionResult("price_low", priceLowResult)[0]
      ];

      return {
        base: ethers.formatEther(priceBase),
        medium: ethers.formatEther(priceMedium),
        high: ethers.formatEther(priceHigh),
        low: ethers.formatEther(priceLow)
      };
    } catch (error) {
      console.error('Error getting prices:', error);
      return null;
    }
  }

  // Vérifier si le wallet est connecté
  isWalletConnected() {
    return this.isConnected && this.signer !== null;
  }

  // Obtenir l'adresse du wallet connecté
  async getWalletAddress() {
    if (!this.signer) return null;
    return await this.signer.getAddress();
  }
}

// Créer une instance singleton
const web3Service = new Web3Service();

export default web3Service; 