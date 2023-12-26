// src/main.js
import {
    SystemProgram,
    Keypair,
    Connection,
    clusterApiUrl,
    TransactionMessage,
    VersionedTransaction,
} from "@solana/web3.js";
import {
    MINT_SIZE,
    TOKEN_PROGRAM_ID,
    createInitializeMintInstruction,
    getMinimumBalanceForRentExemptMint,
    getAssociatedTokenAddress,
    createAssociatedTokenAccountInstruction,
    createMintToInstruction,
} from "@solana/spl-token";
import {
    createCreateMetadataAccountV3Instruction,
} from "@metaplex-foundation/mpl-token-metadata";
import {
    bundlrStorage,
    keypairIdentity,
    Metaplex,
} from "@metaplex-foundation/js";
import { bs58 } from "@project-serum/anchor/dist/cjs/utils/bytes/index.js";
import inquirer from 'inquirer';
import ora from 'ora';
import chalk from 'chalk';

const getNetworkConfig = (network) => {
    return network === "mainnet"
        ? {
            cluster: clusterApiUrl("mainnet-beta"),
            address: "https://node1.bundlr.network",
            providerUrl: "https://api.mainnet-beta.solana.com",
        }
        : {
            cluster: clusterApiUrl("devnet"),
            address: "https://devnet.bundlr.network",
            providerUrl: "https://api.devnet.solana.com",
        };
};

const createMintTokenTransaction = async (connection, metaplex, payer, mintKeypair, token, tokenMetadata, destinationWallet, mintAuthority) => {
    try {
        if (!connection || !metaplex || !payer || !mintKeypair || !token || !tokenMetadata || !destinationWallet || !mintAuthority) {
            throw new Error("Invalid input parameters");
        }

        const requiredBalance = await getMinimumBalanceForRentExemptMint(connection);

        const metadataPDA = metaplex.nfts().pdas().metadata({ mint: mintKeypair.publicKey });
        const tokenATA = await getAssociatedTokenAddress(mintKeypair.publicKey, destinationWallet);

        const txInstructions = [];
        txInstructions.push(
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
                TOKEN_PROGRAM_ID
            ),
            createAssociatedTokenAccountInstruction(
                payer.publicKey,
                tokenATA,
                payer.publicKey,
                mintKeypair.publicKey
            ),
            createMintToInstruction(
                mintKeypair.publicKey,
                tokenATA,
                mintAuthority,
                token.totalSupply * Math.pow(10, token.decimals)
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
                        data: tokenMetadata,
                        isMutable: true,
                        collectionDetails: null,
                    },
                }
            )
        );

        const latestBlockhash = await connection.getLatestBlockhash();

        const messageV0 = new TransactionMessage({
            payerKey: payer.publicKey,
            recentBlockhash: latestBlockhash.blockhash,
            instructions: txInstructions,
        }).compileToV0Message();

        const transaction = new VersionedTransaction(messageV0);
        transaction.sign([payer, mintKeypair]);

        return transaction;
    } catch (error) {
        console.error("Error creating mint token transaction:", error);
        throw error;
    }
};

const uploadMetadata = async (metaplex, tokenMetadata) => {
    try {
        const { uri } = await metaplex.nfts().uploadMetadata(tokenMetadata);
        return uri;
    } catch (error) {
        console.error("Error uploading token metadata:", error);
        throw error;
    }
};

const askQuestions = async () => {
    try {
        const questions = [
            {
                type: 'list',
                name: 'network',
                message: 'Choose the network:',
                choices: ['mainnet', 'devnet'],
                default: 'devnet'
            },
            {
                type: 'input',
                name: 'decimals',
                message: 'Set the token decimals (e.g., 9):',
                default: '9',
                validate: value => !isNaN(value) || 'Please enter a number'
            },
            {
                type: 'input',
                name: 'supply',
                message: 'Set the total token supply (e.g., 1000000):',
                default: '1000000',
                validate: value => !isNaN(value) || 'Please enter a number'
            },
            {
                type: 'input',
                name: 'tokenName',
                message: 'Token name (e.g., MyToken):',
                default: 'MyToken'
            },
            {
                type: 'input',
                name: 'symbol',
                message: 'Token symbol (e.g., MTK):',
                default: 'MTK'
            },
            {
                type: 'input',
                name: 'image',
                message: 'Token image URL (e.g., https://example.com/image.png):',
                default: 'https://example.com/image.png'
            },
            {
                type: 'input',
                name: 'royalty',
                message: 'Set the royalty percentage (basis points, e.g., 500 for 5%):',
                default: '500',
                validate: value => !isNaN(value) || 'Please enter a number'
            },
            {
                type: 'password',
                name: 'secretKey',
                message: 'Enter your wallet secret key:',
                validate: value => value.length > 0 || 'Secret key cannot be empty'
            }
        ];

        return await inquirer.prompt(questions);
    } catch (error) {
        console.error("Error while asking questions:", error);
        throw error;
    }
};

const main = async () => {
    try {
        console.log(chalk.blue("Starting token creation process...\n"));

        const answers = await askQuestions();
        console.log(chalk.yellow("Network selected:"), answers.network);

        const network = getNetworkConfig(answers.network);
        console.log(chalk.yellow("Connecting to Solana cluster:"), network.cluster);
        const connection = new Connection(network.cluster);

        const userWallet = Keypair.fromSecretKey(bs58.decode(answers.secretKey));
        console.log(chalk.yellow("User wallet address:"), userWallet.publicKey.toString());

        const metaplex = Metaplex.make(connection)
            .use(keypairIdentity(userWallet))
            .use(bundlrStorage({ address: network.address, providerUrl: network.providerUrl, timeout: 60000 }));

        const token = {
            decimals: parseInt(answers.decimals),
            totalSupply: parseFloat(answers.supply),
        };

        const tokenMetadata = {
            name: answers.tokenName,
            symbol: answers.symbol,
            image: answers.image,
            sellerFeeBasisPoints: parseInt(answers.royalty),
            decimals: token.decimals,
            totalSupply: token.totalSupply
        };

        console.log(chalk.yellow("Token information:"));
        console.log(chalk.cyan("- Name:"), tokenMetadata.name);
        console.log(chalk.cyan("- Symbol:"), tokenMetadata.symbol);
        console.log(chalk.cyan("- Image URL:"), tokenMetadata.image);
        console.log(chalk.cyan("- Royalty:"), `${tokenMetadata.sellerFeeBasisPoints} basis points`);
        console.log(chalk.cyan("- Decimals:"), tokenMetadata.decimals);
        console.log(chalk.cyan("- Total Supply:"), tokenMetadata.totalSupply, "\n");

        const spinner1 = ora(chalk.yellow("Uploading token metadata...")).start();
        let metadataUri = await uploadMetadata(metaplex, tokenMetadata);
        spinner1.succeed(chalk.green("Metadata uploaded. URI:"), metadataUri);

        const tokenMetadataV2 = {
            ...tokenMetadata,
            uri: metadataUri,
            creators: null,
            collection: null,
            uses: null
        };

        const spinner2 = ora(chalk.yellow("Generating token address...")).start();
        let mintKeypair = Keypair.generate();
        spinner2.succeed(chalk.green(`Generated token address: ${mintKeypair.publicKey.toString()}`));

        const spinner3 = ora(chalk.yellow("Creating and sending mint token transaction...")).start();
        const mintTransaction = await createMintTokenTransaction(connection, metaplex, userWallet, mintKeypair, token, tokenMetadataV2, userWallet.publicKey, mintKeypair.publicKey);
        spinner3.succeed(chalk.green("Transaction successful."));

        let { lastValidBlockHeight, blockhash } = await connection.getLatestBlockhash("finalized");
        const transactionId = await connection.sendTransaction(mintTransaction);
        await connection.confirmTransaction({ signature: transactionId, lastValidBlockHeight, blockhash });

        console.log(chalk.green(`View transaction on Solana Explorer: https://explorer.solana.com/tx/${transactionId}?cluster=${answers.network}`));
        console.log(chalk.green(`View token on Solana Explorer: https://explorer.solana.com/address/${mintKeypair.publicKey.toString()}?cluster=${answers.network}`));

        if (answers.network === "mainnet") {
            console.log(chalk.green(`View token on Solana BirdEye: https://explorer.solana.com/address/${mintKeypair.publicKey.toString()}?cluster=${answers.network}`));
        }
    } catch (error) {
        console.error(chalk.red("An error occurred:"), error);
        process.exit(1);
    }
};

main();