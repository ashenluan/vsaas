const fs = require('fs');

// Fix Layout
const layoutContent = fs.readFileSync('src/app/(dashboard)/layout.tsx', 'utf8');
const fixedLayoutContent = layoutContent.substring(0, layoutContent.lastIndexOf('<div className="flex items-end gap')) + 
`<div className="flex items-end gap-1 mb-3">
                <span className="text-2xl font-bold text-slate-900 leading-none">{balance !== null ? balance : '--'}</span>
                <span className="text-xs text-slate-500 mb-0.5 ml-1">left</span>
              </div>
              <Button size="sm" variant="picmagic" className="w-full text-xs font-bold h-8 cursor-pointer" asChild>
                <Link href="/billing">Top Up Now</Link>
              </Button>
            </div>
          )}

          {/* Bottom user section */}
          <div className="shrink-0 border-t border-[#F1F5F9] p-3">
            {sidebarOpen ? (
              <div className="flex items-center justify-between bg-slate-50 rounded-lg p-2.5">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {userName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 pr-2">
                    <p className="truncate text-sm font-bold text-slate-800 leading-tight">{userName || 'User'}</p>
                    <Link href="/settings" className="text-[11px] font-medium text-slate-500 hover:text-primary transition-colors block truncate">
                      Account Settings
                    </Link>
                  </div>
                </div>
                <button
                  onClick={() => {
                    localStorage.removeItem('accessToken');
                    localStorage.removeItem('refreshToken');
                    window.location.href = '/login';
                  }}
                  className="shrink-0 cursor-pointer p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                  title="Logout"
                >
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2 items-center">
                <Link href="/settings" className="p-2 cursor-pointer text-slate-400 hover:bg-slate-100 hover:text-slate-700 rounded-lg">
                  <Settings size={20} />
                </Link>
                <button
                  onClick={() => {
                    localStorage.removeItem('accessToken');
                    localStorage.removeItem('refreshToken');
                    window.location.href = '/login';
                  }}
                  className="p-2 cursor-pointer text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-lg"
                >
                  <LogOut size={20} />
                </button>
              </div>
            )}
          </div>
        </aside>

        {/* Main content */}
        <div className="flex flex-1 flex-col overflow-hidden bg-[#F8FAFC]">
          <main className="flex-1 overflow-y-auto p-4 md:p-8">{children}</main>
        </div>
      </div>
    </WsProvider>
  );
}`;
fs.writeFileSync('src/app/(dashboard)/layout.tsx', fixedLayoutContent);

// Fix Gallery
const galleryContent = fs.readFileSync('src/app/(dashboard)/gallery/page.tsx', 'utf8');
const fixedGalleryContent = galleryContent.substring(0, galleryContent.lastIndexOf('{/* Meta In')) + 
`{/* Meta Info */}
              <div className="p-3 bg-white">
                <p className="truncate text-xs font-medium text-slate-700 mb-1" title={item.prompt}>
                  {item.prompt || 'Untitled'}
                </p>
                <p className="text-[10px] font-medium text-slate-400">
                  {new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}`;
fs.writeFileSync('src/app/(dashboard)/gallery/page.tsx', fixedGalleryContent);

// Fix Login
const loginContent = fs.readFileSync('src/app/(auth)/login/page.tsx', 'utf8');
const fixedLoginContent = loginContent.substring(0, loginContent.lastIndexOf('Forgot password?</a>\n                )}')) + 
`Forgot password?</a>
                )}
              </div>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="h-11 rounded-xl border-slate-200 bg-white shadow-sm focus-visible:ring-primary focus-visible:ring-offset-0 focus-visible:border-primary px-4 transition-all"
              />
            </div>
            
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 mt-6 rounded-xl font-bold shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all bg-primary hover:bg-blue-700 text-white"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Please wait...
                </div>
              ) : isLogin ? (
                <>Sign in to workspace <ArrowRight size={16} className="ml-2" /></>
              ) : (
                <>Create account <ArrowRight size={16} className="ml-2" /></>
              )}
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-slate-500 font-medium">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
              }}
              className="text-primary font-bold hover:text-blue-700 hover:underline transition-all"
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}`;
fs.writeFileSync('src/app/(auth)/login/page.tsx', fixedLoginContent);
