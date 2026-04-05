// Fix stuck PROCESSING task and clean up
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const taskId = process.argv[2] || 'cmnhwu6bb0009md01q4xg6gzq';

  console.log(`Fixing stuck task: ${taskId}`);

  const task = await p.generation.findUnique({
    where: { id: taskId },
    select: { id: true, status: true, errorMsg: true, creditsUsed: true, userId: true },
  });

  if (!task) {
    console.log('Task not found');
    return;
  }

  console.log('Current:', JSON.stringify(task, null, 2));

  if (task.status !== 'PROCESSING') {
    console.log('Task is not stuck, status:', task.status);
    return;
  }

  // Update to FAILED
  await p.generation.update({
    where: { id: taskId },
    data: {
      status: 'FAILED',
      errorMsg: 'IMS ProduceFailed: The Producing for Editing Project failed (sub-job error)',
      completedAt: new Date(),
    },
  });
  console.log('Updated to FAILED');

  // Refund credits if used
  if (task.creditsUsed && task.userId) {
    const tx = await p.creditTransaction.create({
      data: {
        userId: task.userId,
        amount: task.creditsUsed,
        type: 'REFUND',
        description: `退款: 智能混剪失败 - ProduceFailed`,
        referenceId: taskId,
      },
    });
    await p.user.update({
      where: { id: task.userId },
      data: { credits: { increment: task.creditsUsed } },
    });
    console.log(`Refunded ${task.creditsUsed} credits, txId: ${tx.id}`);
  }

  console.log('Done');
  await p.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
