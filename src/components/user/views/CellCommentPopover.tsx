import { useState } from 'react';
import { MessageSquare, Send } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api-client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Comment {
  id: string;
  comment: string;
  step_label: string | null;
  created_at: string;
  _commenter?: { full_name: string | null; email: string };
}

interface CellCommentPopoverProps {
  responseId: string;
  fieldDefinitionId: string;
  /** Pre-computed: does this cell have comments? Controls the orange triangle visibility */
  hasComments?: boolean;
  /** Label for the current step (e.g. "Répondant", "Validation N1") */
  stepLabel?: string;
  /** Whether the current user can add comments (default: true) */
  canComment?: boolean;
  currentUserId?: string;
}

export function CellCommentPopover({ responseId, fieldDefinitionId, hasComments, stepLabel, canComment = true }: CellCommentPopoverProps) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  // Fetch comments for this field only when open
  const { data: comments = [] } = useQuery<Comment[]>({
    queryKey: ['cell_comments', responseId, fieldDefinitionId],
    queryFn: async () => {
      return api.get<Comment[]>(`/api/surveys/responses/${responseId}/field-comments?fieldDefinitionId=${fieldDefinitionId}`);
    },
    enabled: open,
  });

  const handleSend = async () => {
    if (!text.trim() || saving) return;
    setSaving(true);
    try {
      await api.post(`/api/surveys/responses/${responseId}/field-comments`, {
        field_definition_id: fieldDefinitionId,
        comment: text.trim(),
        comment_type: 'info',
        step_label: stepLabel || null,
      });

      setText('');
      queryClient.invalidateQueries({ queryKey: ['cell_comments', responseId, fieldDefinitionId] });
      queryClient.invalidateQueries({ queryKey: queryKeys.surveyResponses.fieldComments(responseId) });
      queryClient.invalidateQueries({ predicate: q => q.queryKey[0] === 'filtered_campaign_responses' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div
          role="button"
          tabIndex={0}
          onClick={(e) => { e.stopPropagation(); setOpen(true); }}
          className="absolute top-0 right-0 w-4 h-4 z-10 cursor-pointer"
        >
          {/* Orange triangle — always visible if comments, visible on hover otherwise */}
          {hasComments ? (
            <div
              className="absolute top-0 right-0 w-0 h-0"
              style={{
                borderStyle: 'solid',
                borderWidth: '0 10px 10px 0',
                borderColor: 'transparent rgb(249 115 22) transparent transparent',
              }}
            />
          ) : (
            <div
              className="absolute top-0 right-0 w-0 h-0 opacity-0 group-hover/cell:opacity-40 transition-opacity"
              style={{
                borderStyle: 'solid',
                borderWidth: '0 8px 8px 0',
                borderColor: 'transparent rgb(156 163 175) transparent transparent',
              }}
            />
          )}
        </div>
      </PopoverTrigger>

      <PopoverContent
        className="w-72 p-0 shadow-lg"
        align="end"
        side="bottom"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Thread */}
        {comments.length > 0 ? (
          <div className="max-h-56 overflow-y-auto divide-y">
            {comments.map(c => (
              <div key={c.id} className="px-3 py-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium truncate">
                    {c._commenter?.full_name || c._commenter?.email || '?'}
                  </span>
                  {c.step_label && (
                    <span className="text-[10px] text-orange-600 shrink-0">· {c.step_label}</span>
                  )}
                  <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
                    {formatDistanceToNow(new Date(c.created_at), { locale: fr, addSuffix: true })}
                  </span>
                </div>
                <p className="text-xs text-foreground mt-0.5 whitespace-pre-wrap">{c.comment}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground px-3 py-3">Aucun commentaire</p>
        )}

        {/* Input */}
        {canComment && (
          <div className="flex items-center gap-1 p-2 border-t bg-muted/30">
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Commenter..."
              className="h-7 text-xs flex-1 bg-background"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 shrink-0"
              disabled={!text.trim() || saving}
              onClick={handleSend}
            >
              <Send className="h-3 w-3" />
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
