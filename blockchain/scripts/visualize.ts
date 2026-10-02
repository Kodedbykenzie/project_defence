import { ethers } from "hardhat";

async function main() {
  const provider = ethers.provider;
  const latest = await provider.getBlockNumber();
  console.log(`latest block: ${latest}`);
  const edges: string[] = [];
  for (let i = 0; i <= latest; i++) {
    const b = await provider.getBlock(i, true);
    console.log(`block ${i}: ${b.transactions.length} txs`);
    for (const tx of b.prefetchedTransactions) {
      console.log(`  ${tx.hash} from=${tx.from} to=${tx.to} nonce=${tx.nonce}`);
      edges.push(`  "${tx.from}" -> "${tx.to ?? "contract-creation"}" [label="blk ${i}"];`);
    }
  }
  console.log("\n// Graphviz DOT — paste into https://dreampuf.github.io/GraphvizOnline/:");
  console.log("digraph tx {\n" + edges.join("\n") + "\n}");
}
main().catch((e) => { console.error(e); process.exit(1); });
