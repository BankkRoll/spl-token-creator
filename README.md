# SPL Token Creator

A CLI tool for creating and minting SPL tokens on the Solana blockchain with advanced features and comprehensive error handling.

## Getting Started

1. **Clone the Repository**

   ```bash
   git clone https://github.com/BankkRoll/spl-token-creator.git
   cd spl-token-creator
   ```

2. **Install Dependencies**

   ```bash
   npm install
   ```

3. **Launch the Creator**
   ```bash
   npm start
   ```

## Interactive Creation Process

1. **Network Selection**

   - Choose between Devnet (testing) and Mainnet (production)
   - Automatic network configuration

2. **Token Configuration**

   - Decimals: 0-9 (default: 9)
   - Total Supply: Any positive number
   - Token Name: Up to 32 characters
   - Symbol: Up to 10 characters
   - Image URL: Valid URL for token image
   - Royalty: 0-100% (in basis points)

3. **Wallet Authentication**
   - Secure secret key input
   - Automatic validation
   - Local-only processing

## Output Information

The tool provides comprehensive information after successful token creation:

- **Token Details**

  - Name and Symbol
  - Decimals and Total Supply
  - Mint Address
  - Associated Token Account

- **Economics**

  - Royalty Percentage
  - Transaction Fees
  - Network Details

- **Transaction Information**
  - Transaction Hash
  - Block Time
  - Execution Duration
  - Explorer Links

## Explorer Integration

- **Automatic Links Generation**
  - Token Explorer URL
  - Transaction Explorer URL
  - Network-aware URLs (Devnet/Mainnet)

## 🛡️ Security Considerations

- Secret keys are never stored or transmitted
- All transactions are signed locally
- Input validation for all parameters
- Secure error handling
- Network-specific configurations

## ⚡ Technical Details

- Uses Versioned Transactions
- Implements Metadata Program V3
- Supports Associated Token Accounts
- Handles PDA derivation
- Manages rent exemption
- Implements proper error handling

## 🔧 Error Handling

The tool includes comprehensive error handling for:

- Invalid inputs
- Network connection issues
- Transaction failures
- Insufficient balances
- Invalid wallet keys
- Metadata creation errors

## 📝 License

MIT License - feel free to use and modify as needed.
