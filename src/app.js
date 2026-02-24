import i18n from './i18n.js';
import { loadImage, checkOriginal, getOriginalStatus, setStatusMessage, showLoading, hideLoading } from './utils.js';
import JSZip from 'jszip';
import mediumZoom from 'medium-zoom';

// global state
let worker = null;
let imageQueue = [];
let processedCount = 0;
let zoom = null;

// dom elements references
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const singlePreview = document.getElementById('singlePreview');
const multiPreview = document.getElementById('multiPreview');
const imageList = document.getElementById('imageList');
const progressText = document.getElementById('progressText');
const downloadAllBtn = document.getElementById('downloadAllBtn');
const originalImage = document.getElementById('originalImage');
const processedSection = document.getElementById('processedSection');
const processedImage = document.getElementById('processedImage');
const originalInfo = document.getElementById('originalInfo');
const processedInfo = document.getElementById('processedInfo');
const downloadBtn = document.getElementById('downloadBtn');
const resetBtn = document.getElementById('resetBtn');
const startGuideBtn = document.getElementById('startGuideBtn');

/**
 * initialize the application
 */
async function init() {
    try {
        await i18n.init();
        setupLanguageSwitch();
        startApp();
    } catch (error) {
        hideLoading();
        console.error('initialize error:', error);
    }
}

function initWorker() {
    return new Promise((resolve, reject) => {
        worker = new Worker('image.worker.js');
        worker.onmessage = (e) => {
            if (e.data.type === 'init' && e.data.success) {
                resolve();
            }
        };
        worker.onerror = reject;
        worker.postMessage({ type: 'init' });
    });
}

async function startApp() {
    try {
        showLoading(i18n.t('status.loading'));
        await initWorker();

        // Listen for worker messages
        worker.onmessage = handleWorkerMessage;

        hideLoading();
        setupEventListeners();

        zoom = mediumZoom('[data-zoomable]', {
            margin: 24,
            scrollOffset: 0,
            background: 'rgba(255, 255, 255, .6)',
        })
    } catch (error) {
        hideLoading();
        console.error('startApp error:', error);
    }
}

function handleWorkerMessage(e) {
    const { type, payload } = e.data;

    if (type === 'process') {
        const { id, blob, originalSize } = payload;
        const item = imageQueue.find(i => i.id === id);
        if (!item) return;

        item.processedBlob = blob;
        item.processedUrl = URL.createObjectURL(blob);

        if (imageQueue.length === 1) {
            handleSingleProcessed(item, originalSize);
        } else {
            handleMultiProcessed(item, originalSize);
        }
    } else if (type === 'getInfo') {
        const { id, info } = payload;
        const item = imageQueue.find(i => i.id === id);
        if (!item) return;

        if (imageQueue.length === 1) {
            originalInfo.innerHTML = `
                <p>${i18n.t('info.size')}: ${item.originalImg.width}×${item.originalImg.height}</p>
                <p>${i18n.t('info.watermark')}: ${info.size}×${info.size}</p>
                <p>${i18n.t('info.position')}: (${info.position.x},${info.position.y})</p>
            `;
        }
    } else if (type === 'error') {
        const { id } = payload;
        console.error('Worker error for id', id, payload.message);
        if (id) {
            const item = imageQueue.find(i => i.id === id);
            if (item) {
                item.status = 'error';
                updateStatus(item.id, i18n.t('status.failed'));
            }
        }
    }
}

function handleSingleProcessed(item, originalSize) {
    processedImage.src = item.processedUrl;
    processedSection.style.display = 'block';
    downloadBtn.style.display = 'flex';
    downloadBtn.onclick = () => downloadImage(item);

    processedInfo.innerHTML = `
        <p>${i18n.t('info.size')}: ${originalSize.width}×${originalSize.height}</p>
        <p>${i18n.t('info.status')}: ${i18n.t('info.removed')}</p>
    `;

    zoom.detach();
    zoom.attach('[data-zoomable]');
    processedSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function handleMultiProcessed(item, originalSize) {
    document.getElementById(`result-${item.id}`).src = item.processedUrl;
    item.status = 'completed';

    // We can't get sync info anymore, so we rely on what we might have or wait for a separate info message if needed.
    // For simplicity, in multi-mode, we update status to simply "Completed" or similar if details aren't critical,
    // OR we request info from worker earlier.
    // In this refactor, let's request info right before processing.

    const downloadBtn = document.getElementById(`download-${item.id}`);
    downloadBtn.classList.remove('hidden');
    downloadBtn.onclick = () => downloadImage(item);

    processedCount++;
    updateProgress();
    updateStatus(item.id, i18n.t('info.removed'));
}

/**
 * setup language switch
 */
function setupLanguageSwitch() {
    const btn = document.getElementById('langSwitch');
    btn.textContent = i18n.locale === 'zh-CN' ? 'EN' : '中文';
    btn.addEventListener('click', async () => {
        const newLocale = i18n.locale === 'zh-CN' ? 'en-US' : 'zh-CN';
        await i18n.switchLocale(newLocale);
        btn.textContent = newLocale === 'zh-CN' ? 'EN' : '中文';
        updateDynamicTexts();
    });
}

/**
 * setup event listeners
 */
function setupEventListeners() {
    uploadArea.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFileSelect);

    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        handleFiles(Array.from(e.dataTransfer.files));
    });

    downloadAllBtn.addEventListener('click', downloadAll);
    resetBtn.addEventListener('click', reset);

    if (startGuideBtn) {
        startGuideBtn.addEventListener('click', startTour);
    }
}

let driverObj = null;

function startTour() {
    const config = {
        showProgress: true,
        animate: true,
        allowClose: true,
        doneBtnText: i18n.t('tour.done'),
        nextBtnText: i18n.t('tour.next'),
        prevBtnText: i18n.t('tour.prev'),
        steps: [
            {
                element: '#uploadBoxCenter',
                popover: {
                    title: i18n.t('tour.upload.title'),
                    description: i18n.t('tour.upload.desc'),
                    side: 'bottom',
                    align: 'center'
                }
            },
            {
                element: '#downloadBtn',
                popover: {
                    title: i18n.t('tour.download.title'),
                    description: i18n.t('tour.download.desc'),
                    side: 'left',
                    align: 'start'
                }
            }
        ]
    };

    if (!driverObj) {
        driverObj = window.driver.js.driver(config);
    } else {
        driverObj.setConfig(config);
        driverObj.setSteps(config.steps);
    }

    // Scroll to the workspace area
    const workspace = document.getElementById('workspace');
    if (workspace) {
        workspace.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => driverObj.drive(), 500);
    } else {
        driverObj.drive();
    }
}

function reset() {
    singlePreview.style.display = 'none';
    multiPreview.style.display = 'none';
    processedSection.style.display = 'none';
    imageQueue = [];
    processedCount = 0;
    fileInput.value = '';
}

function handleFileSelect(e) {
    handleFiles(Array.from(e.target.files));
}

function handleFiles(files) {
    const validFiles = files.filter(file => {
        if (!file.type.match('image/(jpeg|png|webp)')) return false;
        if (file.size > 20 * 1024 * 1024) return false;
        return true;
    });

    if (validFiles.length === 0) return;

    imageQueue.forEach(item => {
        if (item.originalUrl) URL.revokeObjectURL(item.originalUrl);
        if (item.processedUrl) URL.revokeObjectURL(item.processedUrl);
    });

    imageQueue = validFiles.map((file, index) => ({
        id: Date.now() + index,
        file,
        name: file.name,
        status: 'pending',
        originalImg: null,
        processedBlob: null,
        originalUrl: null,
        processedUrl: null
    }));

    processedCount = 0;

    if (validFiles.length === 1) {
        singlePreview.style.display = 'block';
        multiPreview.style.display = 'none';
        processSingle(imageQueue[0]);
    } else {
        singlePreview.style.display = 'none';
        multiPreview.style.display = 'block';
        imageList.innerHTML = '';
        updateProgress();
        multiPreview.scrollIntoView({ behavior: 'smooth', block: 'start' });
        imageQueue.forEach(item => createImageCard(item));
        processQueue();
    }
}

async function processSingle(item) {
    try {
        const img = await loadImage(item.file);
        item.originalImg = img;

        const { is_google, is_original } = await checkOriginal(item.file);
        const status = getOriginalStatus({ is_google, is_original });
        setStatusMessage(status, is_google && is_original ? 'success' : 'warn');

        originalImage.src = img.src;

        // Request info from worker
        worker.postMessage({
            type: 'getInfo',
            payload: { id: item.id, width: img.width, height: img.height }
        });

        // Send to worker for processing
        // We need ImageBitmap for transfer
        const imageBitmap = await createImageBitmap(item.file);
        worker.postMessage({
            type: 'process',
            payload: { id: item.id, imageBitmap }
        }, [imageBitmap]);

    } catch (error) {
        console.error(error);
    }
}

function createImageCard(item) {
    const card = document.createElement('div');
    card.id = `card-${item.id}`;
    card.className = 'bg-white md:h-[140px] rounded-xl shadow-card border border-gray-100 overflow-hidden';
    card.innerHTML = `
        <div class="flex flex-wrap h-full">
            <div class="w-full md:w-auto h-full flex border-b border-gray-100">
                <div class="w-24 md:w-48 flex-shrink-0 bg-gray-50 p-2 flex items-center justify-center">
                    <img id="result-${item.id}" class="max-w-full max-h-24 md:max-h-full rounded" data-zoomable />
                </div>
                <div class="flex-1 p-4 flex flex-col min-w-0">
                    <h4 class="font-semibold text-sm text-gray-900 mb-2 truncate">${item.name}</h4>
                    <div class="text-xs text-gray-500" id="status-${item.id}">${i18n.t('status.pending')}</div>
                </div>
            </div>
            <div class="w-full md:w-auto ml-auto flex-shrink-0 p-2 md:p-4 flex items-center justify-center">
                <button id="download-${item.id}" class="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-xs md:text-sm hidden">${i18n.t('btn.download')}</button>
            </div>
        </div>
    `;
    imageList.appendChild(card);
}

async function processQueue() {
    await Promise.all(imageQueue.map(async item => {
        const img = await loadImage(item.file);
        item.originalImg = img;
        item.originalUrl = img.src;
        document.getElementById(`result-${item.id}`).src = img.src;
        zoom.attach(`#result-${item.id}`);
    }));

    // In worker mode, we can just dump them all to the worker, 
    // the worker queue (JS event loop) will handle them one by one or in parallel depending on browser implementation,
    // but a single worker is single-threaded.
    // To avoid freezing the transfer, we can limit concurrency of *sending* messages if needed,
    // but sending messages is fast.

    for (const item of imageQueue) {
        if (item.status !== 'pending') continue;

        item.status = 'processing';
        updateStatus(item.id, i18n.t('status.processing'));

        try {
            checkOriginal(item.originalImg).then(({ is_google, is_original }) => {
                if (!is_google || !is_original) {
                    const status = getOriginalStatus({ is_google, is_original });
                    const statusEl = document.getElementById(`status-${item.id}`);
                    if (statusEl) statusEl.innerHTML += `<p class="inline-block mt-1 text-xs md:text-sm text-warn">${status}</p>`;
                }
            }).catch(() => { });

            const imageBitmap = await createImageBitmap(item.file);
            worker.postMessage({
                type: 'process',
                payload: { id: item.id, imageBitmap }
            }, [imageBitmap]);

        } catch (error) {
            item.status = 'error';
            updateStatus(item.id, i18n.t('status.failed'));
            console.error(error);
        }
    }

    // Note: Concurrency control is less critical here since we offloaded to worker, 
    // but if we had multiple workers we could balance load.
    // For now, simpler loop is fine.

    if (imageQueue.length > 0) {
        // We don't know when they finish exactly here, relying on callback
        downloadAllBtn.style.display = 'flex';
    }
}

function updateStatus(id, text, isHtml = false) {
    const el = document.getElementById(`status-${id}`);
    if (el) el.innerHTML = isHtml ? text : text.replace(/\n/g, '<br>');
}

function updateProgress() {
    progressText.textContent = `${i18n.t('progress.text')}: ${processedCount}/${imageQueue.length}`;
}

function updateDynamicTexts() {
    if (progressText.textContent) {
        updateProgress();
    }
}

function downloadImage(item) {
    const a = document.createElement('a');
    a.href = item.processedUrl;
    a.download = `unwatermarked_${item.name.replace(/\.[^.]+$/, '')}.png`;
    a.click();
}

async function downloadAll() {
    const completed = imageQueue.filter(item => item.status === 'completed');
    if (completed.length === 0) return;

    const zip = new JSZip();
    completed.forEach(item => {
        const filename = `unwatermarked_${item.name.replace(/\.[^.]+$/, '')}.png`;
        zip.file(filename, item.processedBlob);
    });

    const blob = await zip.generateAsync({ type: 'blob' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `unwatermarked_${Date.now()}.zip`;
    a.click();
}

init();
