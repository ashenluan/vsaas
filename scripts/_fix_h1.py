"""Fix H1: wrap deduct+create+queue in try-catch with refund on failure."""
import re

with open('apps/api/src/generation/generation.service.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Pattern: find all 4 methods that do deductCredits -> create -> queue.add
# We wrap the create + queue.add in try-catch, refunding on failure.

# Fix 1: createImageGeneration
content = content.replace(
    """    const estimatedCost = provider.estimateCost(input);
    // 先扣费再入队，避免竞态条件
    await this.userService.deductCredits(userId, estimatedCost, `图片生成: ${input.prompt?.slice(0, 50)}`);

    const job = await this.prisma.generation.create({""",
    """    const estimatedCost = provider.estimateCost(input);
    await this.userService.deductCredits(userId, estimatedCost, `图片生成: ${input.prompt?.slice(0, 50)}`);

    let job: any;
    try {
    job = await this.prisma.generation.create({""",
    1,
)

content = content.replace(
    """    this.logger.log(`Created image generation ${job.id} for user ${userId}`);

    // Dispatch to BullMQ
    await this.imageQueue.add('generate', {
      jobId: job.id,
      userId,
      input,
    });

    return job;
  }

  async createVideoGeneration""",
    """    this.logger.log(`Created image generation ${job.id} for user ${userId}`);

    await this.imageQueue.add('generate', {
      jobId: job.id,
      userId,
      input,
    });
    } catch (error) {
      this.logger.error(`Image generation failed to enqueue, refunding ${estimatedCost} credits`);
      await this.userService.addCredits(userId, estimatedCost, 'REFUND', '退款: 任务入队失败');
      if (job) {
        await this.prisma.generation.update({ where: { id: job.id }, data: { status: 'FAILED', errorMsg: '任务入队失败' } }).catch(() => {});
      }
      throw error;
    }

    return job;
  }

  async createVideoGeneration""",
    1,
)

# Fix 2: createVideoGeneration
content = content.replace(
    """    const estimatedCost = provider.estimateCost(input);
    // 先扣费再入队，避免竞态条件
    await this.userService.deductCredits(userId, estimatedCost, `视频生成: ${input.prompt?.slice(0, 50)}`);

    const job = await this.prisma.generation.create({""",
    """    const estimatedCost = provider.estimateCost(input);
    await this.userService.deductCredits(userId, estimatedCost, `视频生成: ${input.prompt?.slice(0, 50)}`);

    let job: any;
    try {
    job = await this.prisma.generation.create({""",
    1,
)

content = content.replace(
    """    this.logger.log(`Created video generation ${job.id} for user ${userId}`);

    // Dispatch to BullMQ
    await this.videoQueue.add('generate', {
      jobId: job.id,
      userId,
      input,
    });

    return job;
  }

  // Cost map""",
    """    this.logger.log(`Created video generation ${job.id} for user ${userId}`);

    await this.videoQueue.add('generate', {
      jobId: job.id,
      userId,
      input,
    });
    } catch (error) {
      this.logger.error(`Video generation failed to enqueue, refunding ${estimatedCost} credits`);
      await this.userService.addCredits(userId, estimatedCost, 'REFUND', '退款: 任务入队失败');
      if (job) {
        await this.prisma.generation.update({ where: { id: job.id }, data: { status: 'FAILED', errorMsg: '任务入队失败' } }).catch(() => {});
      }
      throw error;
    }

    return job;
  }

  // Cost map""",
    1,
)

# Fix 3: createAdvancedImageGeneration
content = content.replace(
    """    const job = await this.prisma.generation.create({
      data: {
        userId,
        type: input.type as any,
        status: 'PENDING',
        provider: 'auto',
        creditsUsed: totalCost,
        input: input as any,
      },
    });

    this.logger.log(`Created advanced image generation ${job.id} (${input.type}) for user ${userId}`);

    await this.imageQueue.add('generate-advanced', {
      jobId: job.id,
      userId,
      input,
    });

    return job;
  }""",
    """    let job: any;
    try {
    job = await this.prisma.generation.create({
      data: {
        userId,
        type: input.type as any,
        status: 'PENDING',
        provider: 'auto',
        creditsUsed: totalCost,
        input: input as any,
      },
    });

    this.logger.log(`Created advanced image generation ${job.id} (${input.type}) for user ${userId}`);

    await this.imageQueue.add('generate-advanced', {
      jobId: job.id,
      userId,
      input,
    });
    } catch (error) {
      this.logger.error(`Advanced image generation failed to enqueue, refunding ${totalCost} credits`);
      await this.userService.addCredits(userId, totalCost, 'REFUND', '退款: 任务入队失败');
      if (job) {
        await this.prisma.generation.update({ where: { id: job.id }, data: { status: 'FAILED', errorMsg: '任务入队失败' } }).catch(() => {});
      }
      throw error;
    }

    return job;
  }""",
    1,
)

# Fix 4: createStoryboardCompose
content = content.replace(
    """    const creditCost = 10; // flat cost for composition
    await this.userService.deductCredits(userId, creditCost, `成片合成: ${input.videos.length} 个分镜`);

    const job = await this.prisma.generation.create({""",
    """    const creditCost = 10; // flat cost for composition
    await this.userService.deductCredits(userId, creditCost, `成片合成: ${input.videos.length} 个分镜`);

    let job: any;
    try {
    job = await this.prisma.generation.create({""",
    1,
)

content = content.replace(
    """    this.logger.log(`Created storyboard compose ${job.id} for user ${userId}`);

    await this.storyboardQueue.add('compose', {
      jobId: job.id,
      userId,
      ...input,
    });

    return job;
  }
}""",
    """    this.logger.log(`Created storyboard compose ${job.id} for user ${userId}`);

    await this.storyboardQueue.add('compose', {
      jobId: job.id,
      userId,
      ...input,
    });
    } catch (error) {
      this.logger.error(`Storyboard compose failed to enqueue, refunding ${creditCost} credits`);
      await this.userService.addCredits(userId, creditCost, 'REFUND', '退款: 任务入队失败');
      if (job) {
        await this.prisma.generation.update({ where: { id: job.id }, data: { status: 'FAILED', errorMsg: '任务入队失败' } }).catch(() => {});
      }
      throw error;
    }

    return job;
  }
}""",
    1,
)

with open('apps/api/src/generation/generation.service.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print('generation.service.ts updated: all 4 methods now refund on queue failure')
