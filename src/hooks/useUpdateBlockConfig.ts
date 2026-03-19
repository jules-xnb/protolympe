import { api } from '@/lib/api-client';
import { useMutationWithToast } from '@/hooks/useMutationWithToast';
import type { Json } from '@/types/database';
import { queryKeys } from '@/lib/query-keys';

interface UpdateBlockConfigParams {
  viewConfigId: string;
  blockIndex: number;
  configUpdate: Record<string, unknown>;
}

interface ViewConfigData {
  id: string;
  config: Json;
}

export function useUpdateBlockConfig() {
  return useMutationWithToast({
    mutationFn: async ({ viewConfigId, blockIndex, configUpdate }: UpdateBlockConfigParams) => {
      // 1. Fetch current view_config
      const viewConfig = await api.get<ViewConfigData>(`/api/view-configs/${viewConfigId}`);

      // 2. Deep clone the config and update the specific block
      const config = structuredClone(viewConfig.config) as Record<string, unknown> & { blocks?: Array<Record<string, unknown>> };

      if (!config?.blocks || !Array.isArray(config.blocks)) {
        throw new Error('Invalid view config: missing blocks array');
      }

      if (blockIndex < 0 || blockIndex >= config.blocks.length) {
        throw new Error(`Invalid block index: ${blockIndex}`);
      }

      // Merge partial update into the block's config
      config.blocks[blockIndex] = {
        ...config.blocks[blockIndex],
        config: {
          ...config.blocks[blockIndex].config,
          ...configUpdate,
        },
      };

      // 3. Save back via API with updated_at timestamp
      const data = await api.patch(`/api/view-configs/${viewConfigId}`, {
        config: config as Json,
        updated_at: new Date().toISOString(),
      });

      return data;
    },
    invalidateKeys: [queryKeys.viewConfigs.all()],
  });
}
