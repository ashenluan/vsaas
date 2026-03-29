export default function AdminSettingsPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">系统设置</h1>
      <div className="space-y-6">
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h3 className="mb-4 font-semibold">API密钥配置</h3>
          <div className="space-y-3">
            {['Grok (xAI)', 'OpenAI (Sora)', '即梦 (火山引擎)', '阿里云 (DashScope)', 'Google (Veo)'].map((provider) => (
              <div key={provider} className="flex items-center gap-4">
                <span className="w-40 text-sm">{provider}</span>
                <input
                  type="password"
                  placeholder="sk-***"
                  className="flex h-9 flex-1 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
                <button className="text-xs text-primary hover:underline">保存</button>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h3 className="mb-4 font-semibold">阿里云 OSS 配置</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Access Key ID</label>
              <input type="password" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Access Key Secret</label>
              <input type="password" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Bucket</label>
              <input type="text" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" placeholder="vsaas-media" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Region</label>
              <input type="text" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" placeholder="oss-cn-shanghai" />
            </div>
          </div>
          <button className="mt-4 inline-flex h-9 items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90">
            保存配置
          </button>
        </div>
      </div>
    </div>
  );
}
