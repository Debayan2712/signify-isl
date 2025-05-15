// Initialize video elements
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const currentTranslation = document.getElementById('currentTranslation');
const historyList = document.getElementById('historyList');

// Control button elements
const toggleMic = document.getElementById('toggleMic');
const toggleCamera = document.getElementById('toggleCamera');
const toggleScreen = document.getElementById('toggleScreen');
const endCall = document.getElementById('endCall');

// Add event listeners for control buttons
toggleMic.addEventListener('click', () => {
    toggleMic.classList.toggle('active');
    // Add microphone toggle logic here
});

toggleCamera.addEventListener('click', () => {
    toggleCamera.classList.toggle('active');
    // Add camera toggle logic here
});

toggleScreen.addEventListener('click', () => {
    toggleScreen.classList.toggle('active');
    // Add screen sharing logic here
});

endCall.addEventListener('click', () => {
    // Add end call logic here
    window.location.href = '/index.html';
});

// Function to update translation history
function addToHistory(text) {
    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const historyItem = document.createElement('div');
    historyItem.className = 'history-item';
    historyItem.innerHTML = `
        <div class="timestamp">${timeString}</div>
        <div class="content">${text}</div>
    `;
    
    historyList.insertBefore(historyItem, historyList.firstChild);
}

// Sample function to update current translation
function updateTranslation(text) {
    currentTranslation.textContent = text;
    addToHistory(text);
}

// Initialize WebRTC and other necessary components
async function initializeCall() {
    try {
        // Request camera and microphone access
        const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        });
        
        // Set local video stream
        localVideo.srcObject = stream;
        
        // Initialize WebRTC connection
        // Add WebRTC initialization code here
        
    } catch (error) {
        console.error('Error accessing media devices:', error);
        alert('Error accessing camera and microphone. Please ensure you have granted the necessary permissions.');
    }
}

// Start the call when the page loads
initializeCall();
