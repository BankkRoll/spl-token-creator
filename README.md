# SPL Token Creator

The SPL Token Creator project allows you to create and mint SPL tokens on the Solana blockchain. 

## Getting Started

To get started with creating and minting SPL tokens, follow these steps:

1. Clone this repository to your local machine:

   ```bash
   git clone https://github.com/BankkRoll/spl-token-creator.git
   ```

2. Navigate to the project directory:

   ```bash
   cd spl-token-creator
   ```

3. Install the project dependencies:

   ```bash
   npm install
   ```


4. Create your token:

   Run the following command to start the token creation process:

   ```bash
   npm start
   ```

6. Follow the prompts:

   The script will prompt you with questions to configure your token, such as token decimals, total supply, token name, symbol, image URL, and royalty percentage.

7. Token Creation:

   - The script will create and send the mint token transaction.
   - You will receive updates on the transaction's success, transaction hash, and links to view the transaction on Solana Explorer and Solana BirdEye (if on the mainnet).

8. Congratulations! You've successfully created and minted an SPL token on the Solana blockchain.

## Additional Information

- This project is designed for local use, and your wallet's secret key is not stored or transmitted over the internet. It's important to keep your wallet's secret key secure and never share it with anyone. The token creation process is entirely local, and your wallet's secret key is only used for transaction signing within the script.

