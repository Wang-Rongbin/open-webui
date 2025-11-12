import { toast } from 'svelte-sonner';
import { uploadFile } from '$lib/apis/files';
import { addFileToKnowledgeById } from '$lib/apis/knowledge';
import { blobToFile } from '$lib/utils';

// 修改uploadFileHandler函数
export const uploadFileHandler = async (token: string, file: File, selectedKnowledgeIds: string[], i18n: any) => {
    const tempItemId = crypto.randomUUID();
    
    if (file.size == 0) {
        toast.error(i18n.t('You cannot upload an empty file.'));
        return null;
    }

    try {
        // 1. 先上传文件获取文件ID
        const uploadedFile = await uploadFile(token, file, null).catch((e) => {
            toast.error(`${e}`);
            return null;
        });

        if (uploadedFile) {
            if (uploadedFile.error) {
                toast.warning(uploadedFile.error);
                return uploadedFile;
            }

            // 2. 循环调用接口，将文件添加到每个选中的知识库
            for (const knowledgeId of selectedKnowledgeIds) {
                await addFileToKnowledgeById(token, knowledgeId, uploadedFile.id);
            }

            toast.success(i18n.t('File added to {{count}} knowledge bases', {
                count: selectedKnowledgeIds.length
            }));
            return uploadedFile;
        } else {
            toast.error(i18n.t('Failed to upload file.'));
            return null;
        }
    } catch (e) {
        toast.error(`${e}`);
        return null;
    }
};

export const uploadDirectoryHandler = async (token: string, knowledgeId: string, i18n: any) => {
    const isFileSystemAccessSupported = 'showDirectoryPicker' in window;

    try {
        if (isFileSystemAccessSupported) {
            await handleModernBrowserUpload(token, knowledgeId, i18n);
        } else {
            await handleFirefoxUpload(token, knowledgeId, i18n);
        }
    } catch (error) {
        handleUploadError(error, i18n);
    }
};

export const createFileFromText = (name: string, content: string): File => {
    const blob = new Blob([content], { type: 'text/plain' });
    return blobToFile(blob, `${name}.txt`);
};

const hasHiddenFolder = (path: string) => {
    return path.split('/').some((part) => part.startsWith('.'));
};

const handleModernBrowserUpload = async (token: string, knowledgeIds: string[], i18n: any) => {
    const dirHandle = await window.showDirectoryPicker();
    let totalFiles = 0;
    let uploadedFiles = 0;

    const updateProgress = () => {
        const percentage = (uploadedFiles / totalFiles) * 100;
        toast.info(
            i18n.t('Upload Progress: {{uploadedFiles}}/{{totalFiles}} ({{percentage}}%)', {
                uploadedFiles: uploadedFiles,
                totalFiles: totalFiles,
                percentage: percentage.toFixed(2)
            })
        );
    };

    async function countFiles(dirHandle) {
        for await (const entry of dirHandle.values()) {
            if (entry.name.startsWith('.')) continue;

            if (entry.kind === 'file') {
                totalFiles++;
            } else if (entry.kind === 'directory') {
                if (!entry.name.startsWith('.')) {
                    await countFiles(entry);
                }
            }
        }
    }

    async function processDirectory(dirHandle, path = '') {
        for await (const entry of dirHandle.values()) {
            if (entry.name.startsWith('.')) continue;

            const entryPath = path ? `${path}/${entry.name}` : entry.name;

            if (hasHiddenFolder(entryPath)) continue;

            if (entry.kind === 'file') {
                const file = await entry.getFile();
                const fileWithPath = new File([file], entryPath, { type: file.type });

                // 传入知识库ID数组
                await uploadFileHandler(token, fileWithPath, knowledgeIds, i18n);
                uploadedFiles++;
                updateProgress();
            } else if (entry.kind === 'directory') {
                if (!entry.name.startsWith('.')) {
                    await processDirectory(entry, entryPath);
                }
            }
        }
    }

    await countFiles(dirHandle);
    updateProgress();

    if (totalFiles > 0) {
        await processDirectory(dirHandle);
    } else {
        console.log('No files to upload.');
    }
};

const handleFirefoxUpload = async (token: string, knowledgeIds: string[], i18n: any) => {
    return new Promise((resolve, reject) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.webkitdirectory = true;
        input.directory = true;
        input.multiple = true;
        input.style.display = 'none';

        document.body.appendChild(input);

        input.onchange = async () => {
            try {
                const files = Array.from(input.files)
                    .filter((file) => !hasHiddenFolder(file.webkitRelativePath));

                let totalFiles = files.length;
                let uploadedFiles = 0;

                const updateProgress = () => {
                    const percentage = (uploadedFiles / totalFiles) * 100;
                    toast.info(
                        i18n.t('Upload Progress: {{uploadedFiles}}/{{totalFiles}} ({{percentage}}%)', {
                            uploadedFiles: uploadedFiles,
                            totalFiles: totalFiles,
                            percentage: percentage.toFixed(2)
                        })
                    );
                };

                updateProgress();

                for (const file of files) {
                    if (!file.name.startsWith('.')) {
                        const relativePath = file.webkitRelativePath || file.name;
                        const fileWithPath = new File([file], relativePath, { type: file.type });

                        await uploadFileHandler(token, fileWithPath, knowledgeIds, i18n);
                        uploadedFiles++;
                        updateProgress();
                    }
                }

                document.body.removeChild(input);
                resolve(true);
            } catch (error) {
                reject(error);
            }
        };

        input.onerror = (error) => {
            document.body.removeChild(input);
            reject(error);
        };

        input.click();
    });
};

const handleUploadError = (error: Error, i18n: any) => {
    if (error.name === 'AbortError') {
        toast.info(i18n.t('Directory selection was cancelled'));
    } else {
        toast.error(i18n.t('Error accessing directory'));
        console.error('Directory access error:', error);
    }
};