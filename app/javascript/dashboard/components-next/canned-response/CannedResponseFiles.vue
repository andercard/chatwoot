<script setup>
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAlert } from 'dashboard/composables';
import { useMapGetter } from 'dashboard/composables/store';
import { useMediaOptimization } from 'dashboard/composables/useMediaOptimization';
import { uploadFile } from 'dashboard/helper/uploadHelper';
import { checkFileSizeLimit, formatBytes } from 'shared/helpers/FileHelper';
import Button from 'dashboard/components-next/button/Button.vue';
import Icon from 'dashboard/components-next/icon/Icon.vue';
import {
  ACCEPTED_FILE_TYPES,
  FILE_KIND,
  FILE_STATUS,
  KIND_ICONS,
  MIME_KINDS,
  UPLOADABLE_MIME_TYPES,
  toPercent,
} from './constants';

const props = defineProps({
  savedFiles: { type: Array, default: () => [] },
});

const emit = defineEmits(['change']);

const { t } = useI18n();
const accountId = useMapGetter('getCurrentAccountId');
const { installationLimit, canToggleHd, prepareMedia } = useMediaOptimization();

const fileInput = ref(null);
const rows = ref([]);
const removedIds = ref([]);
let rowCounter = 0;

const visibleSavedFiles = computed(() =>
  props.savedFiles.filter(file => !removedIds.value.includes(file.id))
);

const isBusy = computed(() =>
  rows.value.some(row => row.status !== FILE_STATUS.READY)
);

watch(
  [rows, removedIds],
  () =>
    emit('change', {
      attachments: rows.value
        .filter(row => row.status === FILE_STATUS.READY)
        .map(row => row.signedId),
      removeAttachmentIds: removedIds.value,
      isBusy: isBusy.value,
    }),
  { deep: true }
);

const setThumb = (row, file) => {
  if (row.kind !== FILE_KIND.IMAGE) return;
  if (row.thumb) URL.revokeObjectURL(row.thumb);
  row.thumb = URL.createObjectURL(file);
};

const upload = async (row, prepared) => {
  row.status = FILE_STATUS.UPLOADING;
  row.progress = 0;
  const { blobId } = await uploadFile(
    prepared.file,
    accountId.value,
    progress => {
      row.progress = progress;
    }
  );
  Object.assign(row, {
    signedId: blobId,
    name: prepared.file.name,
    size: prepared.file.size,
    status: FILE_STATUS.READY,
  });
  setThumb(row, prepared.file);
};

const prepare = (row, profile) => {
  if (row.kind === FILE_KIND.DOCUMENT) return { file: row.originalFile };
  row.status = FILE_STATUS.OPTIMIZING;
  row.progress = 0;
  return prepareMedia(
    { file: row.originalFile },
    {
      profile,
      onProgress: progress => {
        row.progress = progress;
      },
    }
  );
};

const removeRow = row => {
  if (row.thumb) URL.revokeObjectURL(row.thumb);
  rows.value = rows.value.filter(item => item !== row);
};

const addFile = async file => {
  const kind = MIME_KINDS[file.type];
  if (!kind) {
    useAlert(t('CANNED_MGMT.FILES.UNSUPPORTED_TYPE'));
    return;
  }
  if (
    kind === FILE_KIND.DOCUMENT &&
    !checkFileSizeLimit(file, installationLimit.value)
  ) {
    useAlert(
      t('CONVERSATION.FILE_SIZE_LIMIT', {
        MAXIMUM_SUPPORTED_FILE_UPLOAD_SIZE: installationLimit.value,
      })
    );
    return;
  }

  rowCounter += 1;
  const row = reactive({
    key: rowCounter,
    kind,
    name: file.name,
    size: file.size,
    status: FILE_STATUS.UPLOADING,
    progress: 0,
    signedId: null,
    originalFile: file,
    isHd: false,
    canToggleHd: kind !== FILE_KIND.DOCUMENT && canToggleHd(file.type),
    thumb: null,
  });
  setThumb(row, file);
  rows.value.push(row);

  try {
    const prepared = await prepare(row, 'standard');
    if (!prepared) {
      removeRow(row);
      return;
    }
    if (!UPLOADABLE_MIME_TYPES.includes(prepared.file.type)) {
      useAlert(t('CANNED_MGMT.FILES.UNSUPPORTED_TYPE'));
      removeRow(row);
      return;
    }
    await upload(row, prepared);
  } catch (error) {
    row.status = FILE_STATUS.ERROR;
  }
};

const toggleHd = async row => {
  if (row.status !== FILE_STATUS.READY) return;

  const nextIsHd = !row.isHd;
  try {
    const prepared = await prepare(row, nextIsHd ? 'hd' : 'standard');
    if (prepared) {
      await upload(row, prepared);
      row.isHd = nextIsHd;
      return;
    }
  } catch (error) {
    // The file that was already uploaded stays valid
  }
  row.status = FILE_STATUS.READY;
};

const onFilesPicked = event => {
  Array.from(event.target.files).forEach(addFile);
  // Lets the same file be picked again after removing it
  event.target.value = '';
};

const statusText = row => {
  if (row.status === FILE_STATUS.ERROR) {
    return t('CANNED_MGMT.FILES.UPLOAD_FAILED');
  }
  if (row.status === FILE_STATUS.OPTIMIZING) {
    return row.kind === FILE_KIND.VIDEO
      ? t('CONVERSATION.VIDEO_OPTIMIZATION.OPTIMIZING', {
          PERCENT: toPercent(row.progress),
        })
      : t('CONVERSATION.IMAGE_OPTIMIZATION.OPTIMIZING');
  }
  if (row.status === FILE_STATUS.UPLOADING) {
    return t('CANNED_MGMT.FILES.UPLOADING', {
      PERCENT: toPercent(row.progress),
    });
  }
  return formatBytes(row.size, 1);
};

const savedFileKind = file => MIME_KINDS[file.content_type];

onBeforeUnmount(() => {
  rows.value.forEach(row => row.thumb && URL.revokeObjectURL(row.thumb));
});
</script>

<template>
  <div class="flex flex-col w-full gap-2 mb-4">
    <div class="flex items-center justify-between gap-2">
      <span class="text-label text-n-slate-12">
        {{ t('CANNED_MGMT.FILES.TITLE') }}
      </span>
      <Button
        type="button"
        faded
        slate
        xs
        icon="i-lucide-paperclip"
        :label="t('CANNED_MGMT.FILES.ADD')"
        @click="fileInput.click()"
      />
    </div>
    <input
      ref="fileInput"
      type="file"
      multiple
      class="hidden"
      :accept="ACCEPTED_FILE_TYPES"
      @change="onFilesPicked"
    />
    <p class="mb-0 text-label-small text-n-slate-11">
      {{ t('CANNED_MGMT.FILES.HELP') }}
    </p>

    <div
      v-for="file in visibleSavedFiles"
      :key="`saved-${file.id}`"
      class="flex items-center gap-2 p-2 rounded-lg bg-n-slate-3"
    >
      <div
        class="flex items-center justify-center overflow-hidden rounded-md size-10 shrink-0 bg-n-slate-4"
      >
        <img
          v-if="savedFileKind(file) === FILE_KIND.IMAGE"
          :src="file.file_url"
          :alt="file.filename"
          class="object-cover size-full"
        />
        <Icon
          v-else
          :icon="KIND_ICONS[savedFileKind(file)]"
          class="size-5 text-n-slate-11"
        />
      </div>
      <div class="flex-1 min-w-0">
        <span class="block truncate text-label">{{ file.filename }}</span>
        <span class="block truncate text-label-small text-n-slate-11">
          {{ formatBytes(file.byte_size, 1) }}
        </span>
      </div>
      <Button
        type="button"
        ghost
        slate
        xs
        icon="i-lucide-x"
        :aria-label="t('CANNED_MGMT.FILES.REMOVE')"
        @click="removedIds.push(file.id)"
      />
    </div>
    <p
      v-if="visibleSavedFiles.length"
      class="mb-0 text-label-small text-n-slate-11"
    >
      {{ t('CANNED_MGMT.FILES.SAVED_HINT') }}
    </p>

    <div
      v-for="row in rows"
      :key="row.key"
      class="flex items-center gap-2 p-2 rounded-lg bg-n-slate-3"
    >
      <div
        class="flex items-center justify-center overflow-hidden rounded-md size-10 shrink-0 bg-n-slate-4"
      >
        <img
          v-if="row.thumb"
          :src="row.thumb"
          :alt="row.name"
          class="object-cover size-full"
        />
        <Icon
          v-else
          :icon="KIND_ICONS[row.kind]"
          class="size-5 text-n-slate-11"
        />
      </div>
      <div class="flex-1 min-w-0">
        <span class="block truncate text-label">{{ row.name }}</span>
        <span
          class="block truncate text-label-small"
          :class="
            row.status === FILE_STATUS.ERROR
              ? 'text-n-ruby-11'
              : 'text-n-slate-11'
          "
        >
          {{ statusText(row) }}
        </span>
      </div>
      <Button
        v-if="row.canToggleHd"
        v-tooltip.top="t('CONVERSATION.REPLYBOX.TIP_HD_ATTACHMENT')"
        type="button"
        xs
        :label="t('COMPONENTS.MEDIA.HD_BADGE')"
        :variant="row.isHd ? 'solid' : 'ghost'"
        :color="row.isHd ? 'blue' : 'slate'"
        :aria-pressed="row.isHd"
        :is-loading="row.status !== FILE_STATUS.READY && row.signedId !== null"
        :disabled="row.status !== FILE_STATUS.READY"
        @click="toggleHd(row)"
      />
      <Button
        type="button"
        ghost
        slate
        xs
        icon="i-lucide-x"
        :aria-label="t('CANNED_MGMT.FILES.REMOVE')"
        @click="removeRow(row)"
      />
    </div>
  </div>
</template>
