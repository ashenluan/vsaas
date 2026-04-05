// Fix refund - correct field name is creditBalance
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const taskId = process.argv[2] || 'cmnhwu6bb0009md01q4xg6gzq';
  const userId = 'cmncbcsdo0001s23im6krudbx';
  const amount = 20;

  const user = await p.user.findUnique({ where: { id: userId }, select: { creditBalance: true } });
  if (!user) { console.log('User not found'); return; }

  const newBalance = user.creditBalance + amount;

  await p.user.update({
    where: { id: userId },
    data: { creditBalance: newBalance },
  });

  const tx = await p.creditTransaction.create({
    data: {
      userId,
      amount,
      type: 'REFUND',
      description: '退款: 智能混剪失败 - IMS ProduceFailed',
      referenceId: taskId,
      balanceAfter: newBalance,
    },
  });

  console.log(`Refunded ${amount} credits to user ${userId}`);
  console.log(`Previous balance: ${user.creditBalance}, New balance: ${newBalance}`);
  console.log(`Transaction ID: ${tx.id}`);
  await p.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
