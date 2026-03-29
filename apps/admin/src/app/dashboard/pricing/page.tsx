export default function AdminPricingPage() {
  const packages = [
    { name: '体验包', credits: 50, price: 9.9 },
    { name: '基础包', credits: 200, price: 29.9 },
    { name: '专业包', credits: 1000, price: 99.9 },
    { name: '企业包', credits: 5000, price: 399.9 },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">积分包管理</h1>
        <button className="inline-flex h-9 items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90">
          新建积分包
        </button>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {packages.map((pkg) => (
          <div key={pkg.name} className="rounded-xl border bg-card p-6 shadow-sm">
            <h3 className="text-lg font-semibold">{pkg.name}</h3>
            <p className="mt-1 text-2xl font-bold text-primary">¥{pkg.price}</p>
            <p className="mt-1 text-sm text-muted-foreground">{pkg.credits} 积分</p>
            <div className="mt-4 flex gap-2">
              <button className="text-xs text-primary hover:underline">编辑</button>
              <button className="text-xs text-destructive hover:underline">禁用</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
