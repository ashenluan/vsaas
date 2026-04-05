const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

const ids = process.argv.slice(2);
if (!ids.length) {
  ids.push('cmnhwu6bb0009md01q4xg6gzq', 'cmnhx3q2w000fmd01yp4zyvr8');
}

async function main() {
  // Query generation table
  const gens = await p.generation.findMany({
    where: { id: { in: ids } },
    select: {
      id: true, status: true, type: true, provider: true,
      parameters: true, metadata: true, result: true, output: true,
      errorMsg: true, errorMessage: true,
    },
  });

  for (const g of gens) {
    console.log(`\n========== Generation: ${g.id} ==========`);
    console.log('Status:', g.status);
    console.log('Type:', g.type);
    console.log('Provider:', g.provider);
    if (g.errorMsg) console.log('ErrorMsg:', g.errorMsg);
    if (g.errorMessage) console.log('ErrorMessage:', g.errorMessage);
    if (g.parameters) console.log('Parameters:', JSON.stringify(g.parameters, null, 2));
    if (g.metadata) console.log('Metadata:', JSON.stringify(g.metadata, null, 2));
    if (g.result) console.log('Result:', JSON.stringify(g.result, null, 2));
    if (g.output) console.log('Output:', JSON.stringify(g.output, null, 2));
  }

  if (!gens.length) {
    console.log('No generation records found. Trying composeJob...');
    try {
      const jobs = await p.composeJob.findMany({
        where: { id: { in: ids } },
      });
      for (const j of jobs) {
        console.log(`\n========== ComposeJob: ${j.id} ==========`);
        console.log(JSON.stringify(j, null, 2));
      }
    } catch (e) {
      console.error('composeJob query failed:', e.message);
    }
  }

  await p.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
