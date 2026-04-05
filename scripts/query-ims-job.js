// Query IMS job status for failed batch producing jobs
const ICE = require('@alicloud/ice20201109');
const OpenApi = require('@alicloud/openapi-client');

const jobIds = process.argv.slice(2);
if (!jobIds.length) {
  console.error('Usage: node query-ims-job.js <jobId1> [jobId2] ...');
  process.exit(1);
}

const config = new OpenApi.Config({
  accessKeyId: process.env.ALIYUN_ACCESS_KEY_ID || process.env.ALIBABA_CLOUD_ACCESS_KEY_ID,
  accessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET || process.env.ALIBABA_CLOUD_ACCESS_KEY_SECRET,
  endpoint: 'ice.cn-shanghai.aliyuncs.com',
});
const client = new ICE.default(config);

(async () => {
  for (const jobId of jobIds) {
    console.log(`\n========== Job: ${jobId} ==========`);
    try {
      const resp = await client.getBatchMediaProducingJob(
        new ICE.GetBatchMediaProducingJobRequest({ jobId }),
      );
      const job = resp.body?.editingBatchJob;
      if (!job) {
        console.log('No job found');
        continue;
      }
      console.log('Status:', job.status);
      console.log('CompleteTime:', job.completeTime);
      console.log('ModifiedTime:', job.modifiedTime);
      console.log('JobType:', job.jobType);

      // Dump EditingConfig and InputConfig
      if (job.editingConfig) {
        console.log('\nEditingConfig:', typeof job.editingConfig === 'string' ? job.editingConfig : JSON.stringify(job.editingConfig, null, 2));
      }
      if (job.inputConfig) {
        console.log('\nInputConfig:', typeof job.inputConfig === 'string' ? job.inputConfig : JSON.stringify(job.inputConfig, null, 2));
      }
      if (job.outputConfig) {
        console.log('\nOutputConfig:', typeof job.outputConfig === 'string' ? job.outputConfig : JSON.stringify(job.outputConfig, null, 2));
      }
      if (job.extend) {
        try {
          const ext = JSON.parse(job.extend);
          console.log('\nExtend (parsed):', JSON.stringify(ext, null, 2));
        } catch {
          console.log('\nExtend (raw):', job.extend);
        }
      }
      // Check sub-jobs in multiple possible fields
      const subJobs = job.editingJobList || job.subJobList || [];
      if (subJobs.length) {
        console.log(`\nSub-jobs: ${subJobs.length}`);
        for (const sub of subJobs) {
          console.log(`  Sub ${sub.jobId}: status=${sub.status}, code=${sub.code || sub.errorCode}, msg=${sub.message || sub.errorMessage}`);
          if (sub.mediaURL) console.log(`    mediaURL: ${sub.mediaURL}`);
          if (sub.extend) {
            try {
              const se = JSON.parse(sub.extend);
              console.log('    Extend:', JSON.stringify(se, null, 2));
            } catch {
              console.log('    Extend:', sub.extend);
            }
          }
        }
      } else {
        // Dump all keys to find where sub-jobs live
        console.log('\nAll job keys:', Object.keys(job));
        // Also dump the full job for the first one only
        if (jobIds.indexOf(jobId) === 0) {
          console.log('Full job (first only):', JSON.stringify(job, null, 2));
        }
      }
    } catch (err) {
      console.error(`Error querying ${jobId}:`, err.message);
      if (err.data) console.error('Data:', JSON.stringify(err.data));
    }
  }
})();
