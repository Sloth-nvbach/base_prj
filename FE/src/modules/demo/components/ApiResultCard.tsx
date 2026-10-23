import { Badge } from '@/shared/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import type { DemoResult } from '../types/demo.types';

interface ApiResultCardProps {
  /** The last demo action's answer, or nothing has run yet. */
  result: DemoResult | null;
}

/** Shows the raw HTTP answer of the last demo action — the proof this page exists for. */
export const ApiResultCard = ({ result }: ApiResultCardProps) => (
  <Card>
    <CardHeader>
      <CardTitle className="text-base">Last request</CardTitle>
    </CardHeader>
    <CardContent className="space-y-2">
      {!result ? (
        <p className="text-sm text-muted-foreground">Run any action below to see the raw HTTP answer here.</p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{result.label}</Badge>
            <Badge variant={result.status >= 200 && result.status < 300 ? 'default' : 'destructive'}>
              HTTP {result.status}
            </Badge>
          </div>
          <pre className="max-h-80 overflow-auto rounded-md bg-muted p-3 text-xs leading-relaxed">
            {JSON.stringify(result.data ?? null, null, 2)}
          </pre>
        </>
      )}
    </CardContent>
  </Card>
);
