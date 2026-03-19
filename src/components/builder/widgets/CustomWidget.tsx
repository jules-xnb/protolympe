import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Puzzle } from 'lucide-react';

interface CustomConfig {
  content_type?: 'html' | 'markdown' | 'text';
  content?: string;
  background_color?: string;
}

interface CustomWidgetProps {
  title?: string;
  config: CustomConfig;
  className?: string;
}

export function CustomWidget({ title, config, className }: CustomWidgetProps) {
  const content = config.content || 'Contenu personnalisé à définir';
  const contentType = config.content_type || 'text';

  const renderContent = () => {
    switch (contentType) {
      case 'html':
        return (
          <div
            className="prose prose-sm dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        );
      case 'markdown':
        // For now, just render as text. Could add markdown parser later.
        return <p className="text-sm whitespace-pre-wrap">{content}</p>;
      default:
        return <p className="text-sm whitespace-pre-wrap">{content}</p>;
    }
  };

  return (
    <Card 
      className={cn("h-full", className)}
      style={config.background_color ? { backgroundColor: config.background_color } : undefined}
    >
      <CardHeader className="pb-2 flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium">{title || 'Widget personnalisé'}</CardTitle>
        <Puzzle className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {renderContent()}
      </CardContent>
    </Card>
  );
}
