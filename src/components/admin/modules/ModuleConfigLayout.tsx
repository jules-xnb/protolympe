import { useState, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

export interface ModuleConfigTab {
  key: string;
  label: string;
  cta?: ReactNode;
  content: ReactNode;
}

interface ModuleConfigLayoutProps {
  moduleName: string;
  backPath: string;
  tabs: ModuleConfigTab[];
  defaultTab?: string;
}

export function ModuleConfigLayout({
  moduleName,
  backPath,
  tabs,
  defaultTab,
}: ModuleConfigLayoutProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(defaultTab ?? tabs[0]?.key);

  const activeCta = tabs.find((t) => t.key === activeTab)?.cta;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 pb-4">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => navigate(backPath)}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-[20px] font-semibold leading-none">{moduleName}</h1>
        </div>
        <div className="border-b" />
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex flex-col flex-1 min-h-0"
      >
        {/* Tab bar + CTA */}
        <div className="flex items-center justify-between">
          <TabsList className="h-auto bg-transparent p-0 gap-0 rounded-none">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.key}
                value={tab.key}
                className={cn(
                  'rounded-none border-b-2 border-transparent bg-transparent px-4 py-3 text-[16px] font-medium text-secondary-foreground shadow-none transition-colors font-[Raleway]',
                  'data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none data-[state=active]:bg-transparent'
                )}
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {activeCta && <div>{activeCta}</div>}
        </div>

        {/* Tab content areas */}
        {tabs.map((tab) => (
          <TabsContent
            key={tab.key}
            value={tab.key}
            className="flex-1 overflow-auto m-0 p-0 border-none focus-visible:ring-0"
          >
            {tab.content}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
