let frontCamera = true;
let currentFilter = 'none';
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const picturesDiv = document.getElementById('pictures');
const captureButton = document.getElementById('captureButton');
const startRecordingButton = document.getElementById('startRecordingButton');
const stopRecordingButton = document.getElementById('stopRecordingButton');
const toggleButton = document.getElementById('toggleButton');
const downloadButton = document.getElementById('downloadButton');
const filterSelect = document.getElementById('filterSelect');
const switchSidesButton = document.getElementById('switchSidesButton');
const darkModeButton = document.getElementById('darkModeButton');

let images = [];
let videos = [];
let recordedChunks = [];
let mediaRecorder;
let recording = false;

async function startCamera() {
    const constraints = {
        video: { facingMode: frontCamera ? "user" : "environment" }
    };

    try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = stream;
    } catch (err) {
        console.error('Error accessing camera: ', err);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    startCamera();

    toggleButton.addEventListener('click', () => {
        frontCamera = !frontCamera;
        startCamera();
    });

    captureButton.addEventListener('click', () => {
        takePicture();
    });

    startRecordingButton.addEventListener('click', () => {
        startRecording();
    });

    stopRecordingButton.addEventListener('click', () => {
        stopRecording();
    });

    downloadButton.addEventListener('click', () => {
        downloadContent();
    });

    filterSelect.addEventListener('change', (event) => {
        currentFilter = event.target.value;
        applyFilter();
    });

    switchSidesButton.addEventListener('click', () => {
        video.classList.toggle('flip');
    });

    darkModeButton.addEventListener('click', () => {
        toggleDarkMode();
    });
});

function applyFilter() {
    video.style.filter = currentFilter;
}

function startRecording() {
    recording = true;
    recordedChunks = [];
    const options = { mimeType: "video/webm; codecs=vp9" };
    mediaRecorder = new MediaRecorder(canvas.captureStream(), options);
    mediaRecorder.ondataavailable = handleDataAvailable;
    mediaRecorder.start();

    startRecordingButton.style.display = 'none';
    stopRecordingButton.style.display = 'inline';
    captureFrames();
}

function stopRecording() {
    recording = false;
    mediaRecorder.stop();
    startRecordingButton.style.display = 'inline';
    stopRecordingButton.style.display = 'none';
}

function handleDataAvailable(event) {
    if (event.data.size > 0) {
        recordedChunks.push(event.data);
        saveVideo();
    }
}

function captureFrames() {
    const context = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const captureFrame = () => {
        if (recording) {
            context.filter = currentFilter;
            if (video.classList.contains('flip')) {
                context.save();
                context.scale(-1, 1);
                context.translate(-canvas.width, 0);
            }
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            if (video.classList.contains('flip')) {
                context.restore();
            }
            requestAnimationFrame(captureFrame);
        }
    };

    captureFrame();
}

function saveVideo() {
    const blob = new Blob(recordedChunks, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);
    const videoElement = document.createElement('video');
    videoElement.src = url;
    videoElement.controls = true;
    videoElement.classList.add('captured-video');

    if (video.classList.contains('flip')) {
        videoElement.style.transform = 'scaleX(-1)';
    }
    videoElement.style.filter = currentFilter;

    const deleteButton = document.createElement('button');
    deleteButton.textContent = '🗑️';
    deleteButton.addEventListener('click', () => {
        deleteVideo(url);
    });

    const videoDownloadButton = document.createElement('button');
    videoDownloadButton.textContent = '⬇️';
    videoDownloadButton.addEventListener('click', () => {
        downloadVideo(url, blob);
    });

    const videoContainer = document.createElement('div');
    videoContainer.classList.add('video-container');
    videoContainer.appendChild(videoElement);
    videoContainer.appendChild(deleteButton);
    videoContainer.appendChild(videoDownloadButton);
    picturesDiv.appendChild(videoContainer);

    videos.push({ url, blob });
    downloadButton.disabled = false;
}

function takePicture() {
    const context = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.filter = currentFilter;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    if (video.classList.contains('flip')) {
        context.save();
        context.scale(-1, 1);
        context.translate(-canvas.width, 0);
    }

    const imageDataURL = canvas.toDataURL('image/jpeg');
    images.push(imageDataURL);
    displayPicture(imageDataURL);
    downloadButton.disabled = false;
}

function displayPicture(imageDataURL) {
    const img = document.createElement('img');
    img.src = imageDataURL;
    img.classList.add('captured-image');

    if (video.classList.contains('flip')) {
        img.style.transform = 'scaleX(-1)';
    }

    const deleteButton = document.createElement('button');
    deleteButton.textContent = '🗑️';
    deleteButton.addEventListener('click', () => {
        deleteImage(imageDataURL);
    });

    const imageDownloadButton = document.createElement('button');
    imageDownloadButton.textContent = '⬇️';
    imageDownloadButton.addEventListener('click', () => {
        downloadImage(imageDataURL);
    });

    const imageContainer = document.createElement('div');
    imageContainer.classList.add('image-container');
    imageContainer.appendChild(img);
    imageContainer.appendChild(deleteButton);
    imageContainer.appendChild(imageDownloadButton);
    picturesDiv.appendChild(imageContainer);
}

function deleteImage(imageDataURL) {
    const index = images.indexOf(imageDataURL);
    if (index !== -1) {
        images.splice(index, 1);
        refreshImages();
    }
}

function refreshImages() {
    picturesDiv.innerHTML = '';
    images.forEach(displayPicture);
}

function downloadImage(imageDataURL) {
    const a = document.createElement('a');
    a.href = imageDataURL;
    a.download = 'image.jpg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

function toggleDarkMode() {
    const body = document.body;
    body.classList.toggle('dark-mode');
    body.classList.toggle('light-mode');
}

async function downloadContent() {
    const zip = new JSZip();

    images.forEach((imageDataURL, index) => {
        const imageName = `image${index + 1}.jpg`;
        zip.file(imageName, imageDataURL.split('base64,')[1], { base64: true });
    });

    await Promise.all(videos.map(async (video, index) => {
        const videoName = `video${index + 1}.webm`;
        const response = await fetch(video.url);
        const videoBlob = await response.blob();
        zip.file(videoName, videoBlob);
    }));

    zip.generateAsync({ type: "blob" })
        .then(blob => {
            const zipFilename = "media_files.zip";
            saveAs(blob, zipFilename);
        });
}

function deleteVideo(videoUrl) {
    const index = videos.findIndex(video => video.url === videoUrl);
    if (index !== -1) {
        videos.splice(index, 1);
        refreshVideos();
    }
}

function refreshVideos() {
    picturesDiv.innerHTML = '';
    videos.forEach(video => {
        saveVideo();
    });
}

function downloadVideo(videoUrl, blob) {
    const a = document.createElement('a');
    a.href = videoUrl;
    a.download = 'video.webm';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}
