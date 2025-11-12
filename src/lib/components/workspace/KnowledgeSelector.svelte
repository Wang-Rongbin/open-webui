<!-- KnowledgeSelector.svelte -->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { getContext } from 'svelte';
  const i18n = getContext('i18n');
  const dispatch = createEventDispatcher<{
    select: string[]; // 改为返回选中的知识库ID数组
    cancel: void;
  }>();

  export let show = false;
  export let knowledgeBases = [];
  let selectedIds = []; // 存储多选的知识库ID

  // 切换选中状态
  const toggleSelection = (id) => {
    if (selectedIds.includes(id)) {
      selectedIds = selectedIds.filter(item => item !== id);
    } else {
      selectedIds = [...selectedIds, id];
    }
  };

  // 确认选择
  const confirmSelection = () => {
    if (selectedIds.length === 0) {
      toast.warning($i18n.t('Please select at least one knowledge base'));
      return;
    }
    dispatch('select', selectedIds);
    show = false;
    selectedIds = []; // 重置选择
  };
</script>

{#if show}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div class="bg-white dark:bg-gray-900 rounded-2xl p-5 w-full max-w-md">
      <!-- 标题和说明 -->
      <div class="text-lg font-medium mb-1">{$i18n.t('Select Knowledge Bases')}</div>
      <div class="text-xs text-gray-500 mb-4">{$i18n.t('Choose multiple bases to add your file to')}</div>
      
      <!-- 知识库列表（带多选状态） -->
      <div class="max-h-60 overflow-y-auto space-y-2 mb-5">
        {#each knowledgeBases as base}
          <button
            class="w-full text-left p-3 rounded-xl transition {selectedIds.includes(base.id) 
              ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800' 
              : 'hover:bg-gray-100 dark:hover:bg-gray-800 border border-transparent'}"
            on:click={() => toggleSelection(base.id)}
          >
            <div class="flex items-start justify-between">
              <div>
                <div class="font-medium">{base.name}</div>
                <div class="text-xs text-gray-500">
                  {$i18n.t('Updated')} {new Date(base.updated_at * 1000).toLocaleDateString()}
                </div>
              </div>
              <!-- 选中图标 -->
              {#if selectedIds.includes(base.id)}
    <div class="text-blue-600 dark:text-blue-400">✓</div>
  {/if}
            </div>
          </button>
        {:else}
          <div class="text-center p-4 text-gray-500 text-sm">
            {$i18n.t('No knowledge bases available')}
          </div>
        {/each}
      </div>
      
      <!-- 操作按钮 -->
      <div class="flex gap-2">
        <button
          class="flex-1 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm"
          on:click={() => {
            dispatch('cancel');
            show = false;
            selectedIds = [];
          }}
        >
          {$i18n.t('Cancel')}
        </button>
        <button
          class="flex-1 py-2 rounded-xl bg-blue-600 text-white text-sm"
          on:click={confirmSelection}
        >
          {$i18n.t('Confirm')}
        </button>
      </div>
    </div>
  </div>
{/if}