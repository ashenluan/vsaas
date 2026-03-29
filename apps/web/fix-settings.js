const fs = require('fs');
const content = fs.readFileSync('src/app/(dashboard)/settings/page.tsx', 'utf8');

const fixedContent = content.substring(0, content.lastIndexOf('</Card>')) + `</Card>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 py-24 text-center h-full">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <Settings size={28} className="text-slate-400" />
              </div>
              <h3 className="text-base font-semibold text-slate-700 mb-1">Coming Soon</h3>
              <p className="text-sm text-slate-500 max-w-[250px]">These settings will be available in a future update.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}`;
fs.writeFileSync('src/app/(dashboard)/settings/page.tsx', fixedContent);
