export default function AdminModelsPage() {
  const models = [
    { provider: 'Grok', model: 'grok-aurora', type: '文生图', cost: '2积分/张', active: true },
    { provider: '即梦', model: 'jimeng-5.0', type: '文生图', cost: '1.5积分/张', active: true },
    { provider: '即梦', model: 'jimeng-4.6', type: '文生图', cost: '1积分/张', active: true },
    { provider: '通义千问', model: 'qwen-wanxiang', type: '文生图', cost: '1积分/张', active: true },
    { provider: 'Grok', model: 'grok-aurora-video', type: '文生视频', cost: '5积分/秒', active: true },
    { provider: 'Sora', model: 'sora-2', type: '文生视频', cost: '8积分/秒', active: true },
    { provider: 'Sora', model: 'sora-2-pro', type: '文生视频', cost: '15积分/秒', active: true },
    { provider: '即梦', model: 'seedance-2.0', type: '文生视频', cost: '5积分/秒', active: true },
    { provider: 'Google', model: 'veo-3.1', type: '文生视频', cost: '10积分/秒', active: true },
    { provider: '万相', model: 'wan2.2-s2v', type: '数字人', cost: '0.5积分/秒', active: true },
  ];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">模型配置</h1>
      <div className="rounded-xl border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">服务商</th>
              <th className="px-4 py-3 text-left font-medium">模型ID</th>
              <th className="px-4 py-3 text-left font-medium">类型</th>
              <th className="px-4 py-3 text-left font-medium">积分消耗</th>
              <th className="px-4 py-3 text-left font-medium">状态</th>
              <th className="px-4 py-3 text-left font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {models.map((m) => (
              <tr key={m.model} className="border-b last:border-b-0">
                <td className="px-4 py-3">{m.provider}</td>
                <td className="px-4 py-3 font-mono text-xs">{m.model}</td>
                <td className="px-4 py-3">{m.type}</td>
                <td className="px-4 py-3">{m.cost}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                    启用
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button className="text-xs text-primary hover:underline">编辑</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
