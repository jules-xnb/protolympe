import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Users, FileCheck, CheckCircle2 } from 'lucide-react';

interface StepNode {
  id: string;
  name: string;
  type: 'respondent' | 'validation' | 'validated';
}

interface StepsSidebarProps {
  orderedNodes: StepNode[];
  selectedNodeId: string;
  onSelectNode: (id: string) => void;
  onStartNodeNameChange: (name: string) => void;
  onEndNodeNameChange: (name: string) => void;
}

const getNodeIcon = (type: StepNode['type']) => {
  switch (type) {
    case 'respondent': return Users;
    case 'validation': return FileCheck;
    case 'validated': return CheckCircle2;
  }
};

export function StepsSidebar({
  orderedNodes,
  selectedNodeId,
  onSelectNode,
  onStartNodeNameChange,
  onEndNodeNameChange,
}: StepsSidebarProps) {
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="w-[180px] border-r bg-muted/30 shrink-0 flex flex-col">
      <div className="p-3 text-xs font-medium text-muted-foreground uppercase tracking-wider border-b">
        Étapes
      </div>
      <div className="flex-1 overflow-y-auto py-1">
        {orderedNodes.map(node => {
          const Icon = getNodeIcon(node.type);
          const isEditable = node.type === 'respondent' || node.type === 'validated';
          const isEditing = editingNodeId === node.id;

          const commitRename = () => {
            const trimmed = editingName.trim();
            if (trimmed && trimmed !== node.name) {
              if (node.type === 'respondent') onStartNodeNameChange(trimmed);
              else if (node.type === 'validated') onEndNodeNameChange(trimmed);
            }
            setEditingNodeId(null);
          };

          return (
            <Button
              key={node.id}
              variant="ghost"
              onClick={() => onSelectNode(node.id)}
              onDoubleClick={() => {
                if (!isEditable) return;
                setEditingNodeId(node.id);
                setEditingName(node.name);
                setTimeout(() => editInputRef.current?.select(), 0);
              }}
              className={cn(
                'w-full text-left px-3 py-2.5 h-auto text-sm transition-colors flex items-start gap-2 rounded-none',
                'hover:bg-accent/50',
                selectedNodeId === node.id && 'bg-accent font-medium border-l-2 border-primary'
              )}
            >
              <Icon className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                {isEditing ? (
                  <Input
                    ref={editInputRef}
                    value={editingName}
                    onChange={e => setEditingName(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={e => {
                      if (e.key === 'Enter') commitRename();
                      if (e.key === 'Escape') setEditingNodeId(null);
                    }}
                    onClick={e => e.stopPropagation()}
                    className="w-full h-auto p-0 px-1 py-0.5 text-sm bg-transparent border rounded shadow-none focus-visible:border-primary focus-visible:ring-0"
                  />
                ) : (
                  <div className="truncate">{node.name}</div>
                )}
                <span className="text-xs text-muted-foreground">
                  {node.type === 'respondent' ? 'Collecte' : node.type === 'validated' ? 'Final' : 'Validation'}
                </span>
              </div>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
