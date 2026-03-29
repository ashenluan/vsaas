import Link from 'next/link';

export default function DigitalHumanPage() {
  const features = [
    { title: '声音克隆', desc: '上传10-20秒音频，克隆你的专属声音', href: '/digital-human/voices' },
    { title: '数字人形象', desc: '上传人物图片，验证后用于视频生成', href: '/digital-human/avatars' },
    { title: '脚本编辑', desc: '编写口播文案，支持多段分组', href: '/digital-human/scripts' },
    { title: '批量混剪', desc: '组合素材，批量生成数字人视频', href: '/digital-human/compose' },
  ];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">数字人视频</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {features.map((f) => (
          <Link
            key={f.href}
            href={f.href}
            className="rounded-xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
          >
            <h3 className="mb-2 font-semibold">{f.title}</h3>
            <p className="text-sm text-muted-foreground">{f.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
