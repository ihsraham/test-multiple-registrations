const { Web3Auth } = require("@web3auth/node-sdk");
const { EthereumPrivateKeyProvider } = require("@web3auth/ethereum-provider");
const jwt = require('jsonwebtoken');
const fs = require('fs');

// Web3Auth Configurations
const clientId = "BPi5PB_UiIZ-cPz1GtV5i1I2iOSOHuimiXBI0e-Oe_u6X3oVAbCiAZOTEBtTXw4tsluTITPqA8zMsfxIKMjiqNQ"; // Client ID from Web3Auth Dashboard
const verifier = "test-node-demo";

// Initialize Web3Auth SDK
const web3auth = new Web3Auth({
  clientId,
  web3AuthNetwork: "sapphire_mainnet", // Network ID from Web3Auth Dashboard
});

const ethereumProvider = new EthereumPrivateKeyProvider({
  config: {
    chainConfig: {
      chainNamespace: "eip155",
      chainId: "0x13882",
      rpcTarget: "https://rpc-amoy.polygon.technology/"
    }
  }
});

web3auth.init({ provider: ethereumProvider });

// Read Private Key for JWT signing
const privateKey = fs.readFileSync('privateKey.pem');

// Function to generate unique JWT token
const generateJwtToken = () => {
  const sub = Math.random().toString(36).substring(7); // Unique verifierId for each token
  return {
    token: jwt.sign(
      {
        sub: sub,
        name: 'Agrawal Alam Mishra Rawski Bherwani',
        email: 'devrel@web3auth.io',
        aud: 'urn:api-web3auth-io',
        iss: 'https://web3auth.io',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 60 * 60,
      },
      privateKey,
      { algorithm: 'RS256', keyid: '46f2304094436dd932ab5e' },
    ),
    sub: sub
  };
};

// Function to connect to Web3Auth with a given token and verifierId
const connectToWeb3Auth = async (idToken, verifierId) => {
  try {
    const provider = await web3auth.connect({
      verifier: verifier,
      verifierId: verifierId,
      idToken: idToken,
    });
    const eth_private_key = await provider.request({ method: "eth_private_key" });
    const eth_address = await provider.request({ method: "eth_accounts" });
    return { eth_private_key, eth_address: eth_address[0] };
  } catch (error) {
    console.error(`Error during Web3Auth connection for verifierId ${verifierId}:`, error);
    return null;
  }
};

// Main function to perform multiple registrations concurrently
const performConcurrentRegistrations = async (numRegistrations) => {
  const promises = [];
  for (let i = 0; i < numRegistrations; i++) {
    const { token, sub } = generateJwtToken();
    promises.push(connectToWeb3Auth(token, sub));
  }

  const results = await Promise.all(promises);

  // Format and print the results
  results.forEach((result, index) => {
    if (result) {
      console.log(`Registration ${index + 1}:\nETH PrivateKey: ${result.eth_private_key}\nETH Address: ${result.eth_address}\n`);
    } else {
      console.log(`Registration ${index + 1} failed.\n`);
    }
  });

  const addresses = results.map(result => result && result.eth_address).filter(Boolean);
  const uniqueAddresses = new Set(addresses);

  if (uniqueAddresses.size === 1) {
    console.log("All registrations resulted in the same ETH address.");
  } else {
    console.log("Registrations resulted in different ETH addresses.");
  }

  process.exit(0);
};

// Perform 5 concurrent registrations
performConcurrentRegistrations(5).catch(console.error);
