// Query DB for failed vs successful task
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

const ids = process.argv.slice(2);
if (!ids.length) ids.push('cmnhwu6bb0009md01q4xg6gzq', 'cmnhx3q2w000fmd01yp4zyvr8');

(async () => {
  try {
    const tasks = await p.generation.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        status: true,
        progress: true,
        input: true,
        error: true,
      },
    });
    for (const task of tasks) {
      console.log(`\n========== Task: ${task.id} ==========`);
      console.log('Status:', task.status);
      console.log('Progress:', task.progress);
      if (task.error) console.log('Error:', task.error);
      if (task.input) {
        const input = typeof task.input === 'string' ? JSON.parse(task.input) : task.input;
        console.log('Input:', JSON.stringify(input, null, 2));
      }
    }
  } catch (err) {
    console.error('Query failed:', err.message);
    // Try DigitalHumanTask table instead
    try {
      const tasks = await p.digitalHumanTask.findMany({
        where: { id: { in: ids } },
      });
      for (const task of tasks) {
        console.log(`\n========== Task: ${task.id} ==========`);
        console.log('Status:', task.status);
        console.log('Progress:', task.progress);
        console.log('Error:', task.errorMsg);
        console.log('IMS Job:', task.imsJobId);
        if (task.input) {
          const input = typeof task.input === 'string' ? JSON.parse(task.input) : task.input;
          console.log('Input:', JSON.stringify(input, null, 2));
        }
      }
    } catch (err2) {
      console.error('DigitalHumanTask query also failed:', err2.message);
    }
  } finally {
    await p.$disconnect();
  }
})();
