'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Home, RefreshCcw, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error('Workspace error:', error);
  }, [error]);

  return (
    <div className="mx-auto flex h-full max-w-lg items-center justify-center p-6">
      <Card className="w-full shadow-lg border-slate-200/60 overflow-hidden rounded-3xl">
        <div className="h-2 bg-gradient-to-r from-red-500 to-orange-500"></div>
        <CardContent className="p-10 flex flex-col items-center text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-50 shadow-inner">
            <AlertTriangle className="h-10 w-10 text-red-500" />
          </div>
          
          <h2 className="mb-2 text-2xl font-extrabold tracking-tight text-slate-900">Oops, something went wrong!</h2>
          <p className="mb-8 text-sm font-medium text-slate-500 max-w-sm">
            We've encountered an unexpected issue while loading your workspace. Our team has been notified.
          </p>
          
          <div className="flex w-full flex-col gap-3 sm:flex-row">
            <Button 
              onClick={() => reset()} 
              className="flex-1 rounded-xl h-11 font-bold shadow-md hover:shadow-lg transition-all"
            >
              <RefreshCcw className="mr-2 h-4 w-4" /> Try Again
            </Button>
            <Button 
              variant="outline" 
              onClick={() => router.push('/workspace')}
              className="flex-1 rounded-xl h-11 font-bold border-slate-200 shadow-sm"
            >
              <Home className="mr-2 h-4 w-4" /> Go Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
