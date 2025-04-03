// src/main.js
import { PROGRAM_ID as TOKEN_METADATA_PROGRAM_ID_DIST } from "@metaplex-foundation/mpl-token-metadata/dist/src/generated/index.js";
import { createCreateMetadataAccountV3Instruction } from "@metaplex-foundation/mpl-token-metadata/dist/src/generated/instructions/CreateMetadataAccountV3.js";
import {
  createAssociatedTokenAccountInstruction,
  createInitializeMintInstruction,
  createMintToInstruction,
  getAssociatedTokenAddress,
  getMinimumBalanceForRentExemptMint,
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  clusterApiUrl,
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import bs58 from "bs58";
import chalk from "chalk";
import figlet from "figlet";
import gradient from "gradient-string";
import inquirer from "inquirer";
import { createSpinner } from "nanospinner";

// Utility Functions
const sleep = (ms = 1000) => new Promise((resolve) => setTimeout(resolve, ms));

const displayTitle = () => {
  console.clear();
  const title = gradient.pastel.multiline(
    figlet.textSync("SPL Token Creator", {
      font: "Standard",
      horizontalLayout: "default",
      verticalLayout: "default",
    }),
  );
  console.log(title);
  console.log(gradient.rainbow("=".repeat(80)));
  console.log("\n");
};

const getNetworkConfig = (network) => {
  const config =
    network === "mainnet"
      ? {
          cluster: clusterApiUrl("mainnet-beta"),
          name: "Mainnet",
          explorerUrl: "https://solscan.io",
          symbol: "SOL",
        }
      : {
          cluster: clusterApiUrl("devnet"),
          name: "Devnet",
          explorerUrl: "https://solscan.io",
          symbol: "SOL (Devnet)",
        };
  return {
    ...config,
    commitment: "confirmed",
  };
};

const validateDecimals = (value) => {
  const parsed = parseInt(value);
  if (isNaN(parsed)) return "Please enter a valid number";
  if (parsed < 0 || parsed > 9) return "Decimals must be between 0 and 9";
  return true;
};

const validateSupply = (value) => {
  const parsed = parseFloat(value);
  if (isNaN(parsed)) return "Please enter a valid number";
  if (parsed <= 0) return "Supply must be greater than 0";
  return true;
};

const validateTokenName = (value) => {
  if (!value.trim()) return "Token name cannot be empty";
  if (value.length > 32) return "Token name must be 32 characters or less";
  return true;
};

const validateSymbol = (value) => {
  if (!value.trim()) return "Symbol cannot be empty";
  if (value.length > 10) return "Symbol must be 10 characters or less";
  return true;
};

const validateImageUrl = (value) => {
  try {
    new URL(value);
    return true;
  } catch {
    return "Please enter a valid URL";
  }
};

const validateRoyalty = (value) => {
  const parsed = parseInt(value);
  if (isNaN(parsed)) return "Please enter a valid number";
  if (parsed < 0 || parsed > 10000)
    return "Royalty must be between 0 and 10000 basis points (0-100%)";
  return true;
};

const askQuestions = async () => {
  displayTitle();

  const questions = [
    {
      type: "list",
      name: "network",
      message: "Choose the network:",
      choices: [
        { name: "🔧 Devnet (Testing)", value: "devnet" },
        { name: "🌐 Mainnet (Production)", value: "mainnet" },
      ],
      default: "devnet",
    },
    {
      type: "input",
      name: "decimals",
      message: "Set the token decimals (0-9):",
      default: "9",
      validate: validateDecimals,
      transformer: (input) => chalk.cyan(input),
    },
    {
      type: "input",
      name: "supply",
      message: "Set the total token supply:",
      default: "1000000",
      validate: validateSupply,
      transformer: (input) => chalk.cyan(input),
    },
    {
      type: "input",
      name: "tokenName",
      message: "Token name:",
      validate: validateTokenName,
      transformer: (input) => chalk.cyan(input),
    },
    {
      type: "input",
      name: "symbol",
      message: "Token symbol:",
      validate: validateSymbol,
      transformer: (input) => chalk.green(input.toUpperCase()),
    },
    {
      type: "input",
      name: "image",
      message: "Token image URL:",
      validate: validateImageUrl,
      transformer: (input) => chalk.blue(input),
    },
    {
      type: "input",
      name: "royalty",
      message: "Set the royalty percentage (0-100%):",
      default: "0",
      validate: validateRoyalty,
      transformer: (input) =>
        chalk.yellow(`${(parseInt(input) / 100).toFixed(2)}%`),
    },
    {
      type: "password",
      name: "secretKey",
      message: "Enter your wallet secret key:",
      mask: "*",
      validate: (value) => {
        try {
          const decoded = bs58.decode(value);
          return decoded.length === 64 || "Invalid secret key length";
        } catch {
          return "Invalid secret key format";
        }
      },
    },
  ];

  return inquirer.prompt(questions);
};

const createMintTokenTransaction = async (
  connection,
  payer,
  mintKeypair,
  token,
  tokenMetadata,
  destinationWallet,
  mintAuthority,
) => {
  try {
    const spinner = createSpinner("Preparing transaction...").start();

    const requiredBalance =
      await getMinimumBalanceForRentExemptMint(connection);

    // Calculate the metadata PDA
    const [metadataPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        TOKEN_METADATA_PROGRAM_ID_DIST.toBuffer(),
        mintKeypair.publicKey.toBuffer(),
      ],
      TOKEN_METADATA_PROGRAM_ID_DIST,
    );

    const tokenATA = await getAssociatedTokenAddress(
      mintKeypair.publicKey,
      destinationWallet,
    );

    const instructions = [
      SystemProgram.createAccount({
        fromPubkey: payer.publicKey,
        newAccountPubkey: mintKeypair.publicKey,
        space: MINT_SIZE,
        lamports: requiredBalance,
        programId: TOKEN_PROGRAM_ID,
      }),
      createInitializeMintInstruction(
        mintKeypair.publicKey,
        token.decimals,
        mintAuthority,
        null,
        TOKEN_PROGRAM_ID,
      ),
      createAssociatedTokenAccountInstruction(
        payer.publicKey,
        tokenATA,
        payer.publicKey,
        mintKeypair.publicKey,
      ),
      createMintToInstruction(
        mintKeypair.publicKey,
        tokenATA,
        mintAuthority,
        token.totalSupply * Math.pow(10, token.decimals),
      ),
      createCreateMetadataAccountV3Instruction(
        {
          metadata: metadataPDA,
          mint: mintKeypair.publicKey,
          mintAuthority: mintAuthority,
          payer: payer.publicKey,
          updateAuthority: mintAuthority,
        },
        {
          createMetadataAccountArgsV3: {
            data: {
              name: tokenMetadata.name,
              symbol: tokenMetadata.symbol,
              uri: tokenMetadata.uri,
              sellerFeeBasisPoints: tokenMetadata.sellerFeeBasisPoints,
              creators: null,
              collection: null,
              uses: null,
            },
            isMutable: true,
            collectionDetails: null,
          },
        },
      ),
    ];

    spinner.success({ text: "Transaction prepared successfully" });

    const latestBlockhash = await connection.getLatestBlockhash("confirmed");
    const messageV0 = new TransactionMessage({
      payerKey: payer.publicKey,
      recentBlockhash: latestBlockhash.blockhash,
      instructions,
    }).compileToV0Message();

    return new VersionedTransaction(messageV0);
  } catch (error) {
    console.error(chalk.red("\nError creating transaction:"), error);
    throw error;
  }
};

const displaySuccessInfo = async (
  connection,
  network,
  mintKeypair,
  txid,
  token,
  tokenMetadata,
  userWallet,
  startTime,
) => {
  const endTime = performance.now();
  const executionTime = ((endTime - startTime) / 1000).toFixed(2);

  // Get transaction details
  const txDetails = await connection.getTransaction(txid, {
    maxSupportedTransactionVersion: 0,
  });
  const fees = txDetails?.meta?.fee || 0;
  const blockTime = txDetails?.blockTime || 0;

  // Get token account
  const tokenATA = await getAssociatedTokenAddress(
    mintKeypair.publicKey,
    userWallet.publicKey,
  );

  console.log("\n" + gradient.rainbow("=".repeat(80)));
  console.log(chalk.bold.green("\n🎉 Token Creation Successful! 🎉\n"));

  console.log(chalk.yellow("📊 Token Details:"));
  console.log(chalk.cyan("• Name:          "), chalk.white(tokenMetadata.name));
  console.log(
    chalk.cyan("• Symbol:        "),
    chalk.white(tokenMetadata.symbol),
  );
  console.log(chalk.cyan("• Decimals:      "), chalk.white(token.decimals));
  console.log(
    chalk.cyan("• Total Supply:  "),
    chalk.white(
      `${token.totalSupply.toLocaleString()} ${tokenMetadata.symbol}`,
    ),
  );
  console.log(
    chalk.cyan("• Mint Address:  "),
    chalk.yellow(mintKeypair.publicKey.toString()),
  );
  console.log(
    chalk.cyan("• Token Account: "),
    chalk.yellow(tokenATA.toString()),
  );

  console.log(chalk.yellow("\n💰 Economics:"));
  console.log(
    chalk.cyan("• Royalty:       "),
    chalk.white(`${tokenMetadata.sellerFeeBasisPoints / 100}%`),
  );
  console.log(
    chalk.cyan("• Transaction Fee:"),
    chalk.white(`${fees / 1e9} ${network.symbol}`),
  );

  console.log(chalk.yellow("\n🔍 Transaction Info:"));
  console.log(chalk.cyan("• TX Hash:       "), chalk.yellow(txid));
  console.log(
    chalk.cyan("• Block Time:    "),
    chalk.white(new Date(blockTime * 1000).toLocaleString()),
  );
  console.log(
    chalk.cyan("• Execution Time:"),
    chalk.white(`${executionTime} seconds`),
  );

  console.log(chalk.yellow("\n🔗 Links:"));
  const tokenUrl =
    network.name === "Mainnet"
      ? `${network.explorerUrl}/token/${mintKeypair.publicKey.toString()}`
      : `${network.explorerUrl}/token/${mintKeypair.publicKey.toString()}?cluster=devnet`;
  const txUrl =
    network.name === "Mainnet"
      ? `${network.explorerUrl}/tx/${txid}`
      : `${network.explorerUrl}/tx/${txid}?cluster=devnet`;

  console.log(chalk.cyan("• Token Explorer:"), chalk.blue(tokenUrl));
  console.log(chalk.cyan("• TX Explorer:   "), chalk.blue(txUrl));

  console.log("\n" + gradient.rainbow("=".repeat(80)) + "\n");
};

const main = async () => {
  try {
    const startTime = performance.now();
    const answers = await askQuestions();
    console.log("\n");

    const network = getNetworkConfig(answers.network);
    const spinner = createSpinner(`Connecting to ${network.name}...`).start();

    const connection = new Connection(network.cluster, network.commitment);
    await sleep(1000);
    spinner.success({ text: `Connected to ${network.name}` });

    const userWallet = Keypair.fromSecretKey(bs58.decode(answers.secretKey));
    console.log(
      chalk.green("\nWallet address:"),
      chalk.cyan(userWallet.publicKey.toString()),
    );

    const token = {
      decimals: parseInt(answers.decimals),
      totalSupply: parseFloat(answers.supply),
    };

    const tokenMetadata = {
      name: answers.tokenName,
      symbol: answers.symbol,
      uri: answers.image,
      sellerFeeBasisPoints: parseInt(answers.royalty),
      creators: null,
      collection: null,
      uses: null,
    };

    console.log(chalk.yellow("\nToken Configuration:"));
    console.log(chalk.cyan("- Name:"), tokenMetadata.name);
    console.log(chalk.cyan("- Symbol:"), tokenMetadata.symbol);
    console.log(chalk.cyan("- Decimals:"), token.decimals);
    console.log(chalk.cyan("- Total Supply:"), token.totalSupply);
    console.log(chalk.cyan("- Image URL:"), tokenMetadata.uri);
    console.log(
      chalk.cyan("- Royalty:"),
      `${tokenMetadata.sellerFeeBasisPoints / 100}%\n`,
    );

    const confirmSpinner = createSpinner("Creating token...").start();
    const mintKeypair = Keypair.generate();

    const transaction = await createMintTokenTransaction(
      connection,
      userWallet,
      mintKeypair,
      token,
      tokenMetadata,
      userWallet.publicKey,
      userWallet.publicKey,
    );

    transaction.sign([userWallet, mintKeypair]);

    const txid = await connection.sendTransaction(transaction);
    await connection.confirmTransaction({
      signature: txid,
      blockhash: transaction.message.recentBlockhash,
      lastValidBlockHeight: (await connection.getBlockHeight()) + 150,
    });

    confirmSpinner.success({ text: "Token created successfully!" });

    await displaySuccessInfo(
      connection,
      network,
      mintKeypair,
      txid,
      token,
      tokenMetadata,
      userWallet,
      startTime,
    );
  } catch (error) {
    console.error(chalk.red("\nError:"), error.message);
    process.exit(1);
  }
};

main();
